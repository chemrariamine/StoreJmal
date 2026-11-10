const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, "data", "mvente.enc");
if (process.env.NODE_ENV === "production" && (!process.env.DATA_ENCRYPTION_KEY || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  throw new Error("Production requires DATA_ENCRYPTION_KEY, ADMIN_EMAIL and ADMIN_PASSWORD.");
}
const KEY = crypto.createHash("sha256").update(process.env.DATA_ENCRYPTION_KEY || "change-this-development-key").digest();
const sessions = new Map();

const seed = {
  products: [
    { id: 1, name: "Chips Nature", detail: "Grand format · 150g", price: 12, category: "chips", emoji: "🥔", stock: 48 },
    { id: 2, name: "Chips Paprika", detail: "Grand format · 150g", price: 12, category: "chips", emoji: "🌶️", stock: 32 },
    { id: 3, name: "Chips Fromage", detail: "Grand format · 150g", price: 14, category: "chips", emoji: "🧀", stock: 21 }
  ],
  categories: [{ id: "chips", name: "Chips" }, { id: "boissons", name: "Boissons" }, { id: "confiseries", name: "Confiseries" }],
  orders: [],
  sellers: []
};

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => {
    if (error) reject(error);
    else resolve(`${salt}:${derived.toString("hex")}`);
  }));
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const derived = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(derived.split(":")[1], "hex"), Buffer.from(hash, "hex"));
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({ iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") });
}

function decrypt(value) {
  const payload = JSON.parse(value);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8"));
}

function readState() {
  if (!fs.existsSync(DATA_FILE)) {
    const state = { ...seed, admin: { email: process.env.ADMIN_EMAIL || "admin@mvente.ma", passwordHash: null } };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, encrypt(state), "utf8");
    return state;
  }
  return decrypt(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeState(state) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, encrypt(state), "utf8");
}

async function ensureAdmin(state) {
  if (!state.admin.passwordHash) {
    state.admin.passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "change-me-now");
    writeState(state);
  }
}

function publicState(state, role, email) {
  return role === "admin"
    ? { products: state.products, categories: state.categories, orders: state.orders, sellers: state.sellers.map(({ passwordHash, ...seller }) => seller) }
    : { products: state.products, categories: state.categories, orders: state.orders.filter(order => order.seller === email) };
}

function body(request) {
  return new Promise((resolve, reject) => {
    let value = "";
    request.on("data", chunk => { value += chunk; if (value.length > 5_000_000) request.destroy(); });
    request.on("end", () => { try { resolve(value ? JSON.parse(value) : {}); } catch (error) { reject(error); } });
    request.on("error", reject);
  });
}

function reply(response, status, value, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(value));
}

function session(request) {
  const token = request.headers.cookie?.match(/mvente_session=([^;]+)/)?.[1];
  return token ? sessions.get(token) : null;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/app.js" || url.pathname === "/styles.css")) {
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      response.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html" });
      fs.createReadStream(path.join(__dirname, file)).pipe(response);
      return;
    }
    const state = readState();
    await ensureAdmin(state);
    if (request.method === "POST" && url.pathname === "/api/login") {
      const input = await body(request);
      let role = null;
      if (input.role === "admin" && input.email === state.admin.email && await verifyPassword(input.password, state.admin.passwordHash)) role = "admin";
      const seller = state.sellers.find(item => item.email === input.email);
      if (!role && input.role === "seller" && seller && await verifyPassword(input.password, seller.passwordHash)) role = "seller";
      if (!role) return reply(response, 401, { error: "Identifiants invalides." });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { role, email: input.email });
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      return reply(response, 200, { role }, { "set-cookie": `mvente_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}` });
    }
    if (request.method === "POST" && url.pathname === "/api/logout") {
      const token = request.headers.cookie?.match(/mvente_session=([^;]+)/)?.[1];
      if (token) sessions.delete(token);
      return reply(response, 200, { ok: true }, { "set-cookie": "mvente_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    }
    const current = session(request);
    if (!current) return reply(response, 401, { error: "Session requise." });
    if (request.method === "GET" && url.pathname === "/api/state") return reply(response, 200, publicState(state, current.role, current.email));
    if (request.method === "POST" && url.pathname === "/api/state" && current.role === "admin") {
      const input = await body(request);
      state.products = input.products;
      state.categories = input.categories;
      state.orders = input.orders;
      const previousSellers = state.sellers;
      state.sellers = [];
      for (const item of input.sellers) {
        const previous = previousSellers.find(old => old.id === item.id);
        state.sellers.push({ ...item, passwordHash: previous?.passwordHash || item.passwordHash || await hashPassword(item.password || crypto.randomBytes(24).toString("hex")) });
        delete state.sellers[state.sellers.length - 1].password;
      }
      writeState(state);
      return reply(response, 200, { ok: true });
    }
    if (request.method === "POST" && url.pathname === "/api/orders") {
      const input = await body(request);
      for (const item of input.items) {
        const product = state.products.find(productItem => productItem.id === item.id);
        if (!product || product.stock < item.quantity) return reply(response, 409, { error: "Stock insuffisant." });
        product.stock -= item.quantity;
      }
      state.orders.unshift({ ...input.order, seller: current.email, items: input.items });
      writeState(state);
      return reply(response, 201, { ok: true });
    }
    return reply(response, 404, { error: "Route introuvable." });
  } catch (error) {
    console.error(error);
    reply(response, 500, { error: "Erreur serveur." });
  }
});

server.listen(PORT, () => console.log(`M'Vente server: http://localhost:${PORT}`));
