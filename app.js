const products = [
  { id: 1, name: "Chips Nature", detail: "Grand format · 150g", price: 12, category: "chips", emoji: "🥔", stock: 48 },
  { id: 2, name: "Chips Paprika", detail: "Grand format · 150g", price: 12, category: "chips", emoji: "🌶️", stock: 32 },
  { id: 3, name: "Chips Fromage", detail: "Grand format · 150g", price: 14, category: "chips", emoji: "🧀", stock: 21 },
  { id: 4, name: "Soda Cola", detail: "Pack de 6 · 33cl", price: 22, category: "boissons", emoji: "🥤", stock: 16 },
  { id: 5, name: "Eau minérale", detail: "Pack de 6 · 50cl", price: 18, category: "boissons", emoji: "💧", stock: 40 },
  { id: 6, name: "Jus d'orange", detail: "Bouteille · 1L", price: 16, category: "boissons", emoji: "🧃", stock: 8 },
  { id: 7, name: "Bonbons fruités", detail: "Sachet · 250g", price: 15, category: "confiseries", emoji: "🍬", stock: 27 },
  { id: 8, name: "Barres chocolatées", detail: "Boîte de 12", price: 28, category: "confiseries", emoji: "🍫", stock: 0 },
  { id: 9, name: "Chewing-gum menthe", detail: "Boîte de 20", price: 20, category: "confiseries", emoji: "🟢", stock: 19 }
];

let cart = [];
let currentCategory = "all";
let editingProductId = null;
let categories = [
  { id: "chips", name: "Chips" },
  { id: "boissons", name: "Boissons" },
  { id: "confiseries", name: "Confiseries" }
];
let sellers = [
  { id: 1, name: "Youssef B.", email: "youssef@mvente.ma", created: "01 nov. 2026" },
  { id: 2, name: "Sara K.", email: "sara@mvente.ma", created: "28 oct. 2026" },
  { id: 3, name: "Amine M.", email: "amine@mvente.ma", created: "15 oct. 2026" }
];
let orders = [
  { id: "#MV-20261012", client: "Épicerie Al Amal", seller: "Youssef B.", date: "01 nov. 2026 · 11:42", total: 486, status: "pending" },
  { id: "#MV-20261011", client: "Snack La Place", seller: "Sara K.", date: "01 nov. 2026 · 10:18", total: 728, status: "pending" },
  { id: "#MV-20261010", client: "Café des Oliviers", seller: "Amine M.", date: "01 nov. 2026 · 09:56", total: 342, status: "pending" },
  { id: "#MV-20261009", client: "Mini Market Nord", seller: "Youssef B.", date: "31 oct. 2026 · 17:20", total: 960, status: "confirmed" },
  { id: "#MV-20261008", client: "Chez Nadia", seller: "Sara K.", date: "31 oct. 2026 · 15:04", total: 215, status: "confirmed" }
];
let currentRole = null;
async function loadServerState() {
  const response = await fetch("/api/state");
  if (!response.ok) throw new Error("Session requise.");
  const state = await response.json();
  products.splice(0, products.length, ...state.products);
  categories = state.categories;
  orders = state.orders || orders;
  sellers = state.sellers || sellers;
  renderProducts();
  renderCategories();
  renderOrders();
  renderSellerOrders();
  renderSellerHistory();
  renderAdminProducts();
  renderSellers();
}
async function saveState() {
  const response = await fetch("/api/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ products, categories, orders, sellers })
  });
  if (!response.ok) throw new Error("Modification refusée par le serveur.");
}

const loginScreen = document.querySelector("#login-screen");
const appShell = document.querySelector(".app-shell");
const loginForm = document.querySelector("#login-form");

const money = value => `${value.toFixed(2).replace(".", ",")} DH`;
const productGrid = document.querySelector("#product-grid");
const orderItems = document.querySelector("#order-items");

function renderProducts() {
  const search = document.querySelector("#product-search").value.toLowerCase();
  const visible = products.filter(product => {
    const matchesCategory = currentCategory === "all" || product.category === currentCategory;
    return matchesCategory && `${product.name} ${product.detail}`.toLowerCase().includes(search);
  });
  productGrid.innerHTML = visible.length ? visible.map(product => `
    <article class="product-card" data-add="${product.id}">
      <div class="product-visual">${product.image ? `<img class="product-image" data-image-preview="${product.image}" src="${product.image}" alt="${product.name}">` : product.emoji}</div>
      <div class="product-info"><div><strong>${product.name}</strong><small>${product.detail}</small></div><span>${money(product.price)}</span></div>
      <small class="product-stock ${product.stock === 0 ? "out-of-stock" : ""}">${product.stock === 0 ? "Rupture de stock" : `${product.stock} en stock`}</small>
      <button class="add-product" ${product.stock === 0 ? "disabled" : ""} aria-label="Ajouter ${product.name}">+</button>
    </article>`).join("") : `<p class="empty-search">Aucun produit trouvé.</p>`;
}

function renderCategories() {
  const categoryTabs = document.querySelector("#category-tabs");
  categoryTabs.innerHTML = `<button class="category ${currentCategory === "all" ? "active" : ""}" data-category="all">Tous les produits</button>${categories.map(category => `<button class="category ${currentCategory === category.id ? "active" : ""}" data-category="${category.id}">${category.name}</button>`).join("")}`;
  document.querySelector("#new-product-category").innerHTML = categories.map(category => `<option value="${category.id}">${category.name}</option>`).join("");
  document.querySelector("#category-list").innerHTML = categories.map(category => `<span class="category-chip">${category.name}<button type="button" data-delete-category="${category.id}" aria-label="Supprimer ${category.name}">×</button></span>`).join("");
  document.querySelectorAll(".category").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderProducts();
  }));
}

function renderCart() {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector("#item-count").textContent = itemCount;
  document.querySelector("#subtotal").textContent = money(subtotal);
  document.querySelector("#total").innerHTML = `${money(subtotal).replace(" DH", ' <small>DH</small>')}`;
  document.querySelector("#send-order").disabled = itemCount === 0;
  orderItems.innerHTML = cart.length ? cart.map(item => `
    <div class="order-item">
      <div class="item-emoji">${item.emoji}</div><div class="item-detail"><strong>${item.name}</strong><small>${money(item.price)} / unité</small></div>
      <div class="quantity"><button data-decrease="${item.id}" aria-label="Retirer une unité">−</button><span>${item.quantity}</span><button data-increase="${item.id}" aria-label="Ajouter une unité">+</button></div>
      <strong class="item-price">${money(item.price * item.quantity)}</strong>
    </div>`).join("") : `<div class="empty-order"><span>🛒</span><strong>Votre panier est vide</strong><small>Choisissez un produit pour commencer.</small></div>`;
}

function addProduct(id) {
  const product = products.find(item => item.id === id);
  const quantityInCart = cart.find(item => item.id === id)?.quantity || 0;
  if (!product || quantityInCart >= product.stock) {
    showToast("Stock insuffisant pour ce produit.");
    return;
  }
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  renderCart();
}

function changeQuantity(id, amount) {
  const item = cart.find(product => product.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(product => product.id !== id);
  renderCart();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function renderOrders() {
  const filter = document.querySelector("#order-filter").value;
  const visible = orders.filter(order => filter === "all" || order.status === filter);
  document.querySelector("#admin-total").textContent = orders.length;
  document.querySelector("#orders-table").innerHTML = visible.map(order => `
    <tr><td>${order.id}</td><td class="customer">${order.client}<small>${order.id}</small></td><td>${order.seller}</td><td>${order.date}</td><td><strong>${money(order.total)}</strong></td>
    <td><span class="status ${order.status}">${order.status === "pending" ? "À confirmer" : "Confirmée"}</span></td>
    <td>${order.status === "pending" ? `<button class="confirm-btn" data-confirm="${order.id}">Confirmer</button>` : "—"}</td></tr>`).join("");
  document.querySelector("#admin-pending").textContent = String(orders.filter(order => order.status === "pending").length).padStart(2, "0");
  document.querySelector("#dashboard-pending-count").textContent = String(orders.filter(order => order.status === "pending").length).padStart(2, "0");
}

function renderSellerOrders() {
  const filter = document.querySelector("#seller-order-filter").value;
  const visible = orders.filter(order => (filter === "all" || order.status === filter));
  const target = document.querySelector("#seller-orders");
  target.innerHTML = visible.length ? visible.map(order => `
    <div class="seller-order-card">
      <div><strong>${order.id}</strong><span>${order.client}</span></div>
      <div><strong>${money(order.total)}</strong><small>${order.date}</small></div>
      <span class="status ${order.status}">${order.status === "pending" ? "En cours" : "Confirmée"}</span>
    </div>`).join("") : `<div class="seller-orders-empty">Aucune vente ${filter === "pending" ? "en cours" : filter === "confirmed" ? "confirmée" : "enregistrée"}.</div>`;
}

function renderSellerHistory() {
  const filter = document.querySelector("#seller-history-filter").value;
  const sellersWithOrders = [...new Set(orders.map(order => order.seller).filter(Boolean))];
  document.querySelector("#seller-history-filter").innerHTML = `<option value="all">Tous les vendeurs</option>${sellersWithOrders.map(email => `<option value="${email}">${email}</option>`).join("")}`;
  document.querySelector("#seller-history-filter").value = filter;
  const visible = orders.filter(order => filter === "all" || order.seller === filter);
  document.querySelector("#seller-history-table").innerHTML = visible.length ? visible.map(order => `
    <tr><td>${order.seller || "—"}</td><td>${order.id}</td><td class="customer">${order.client}</td><td>${order.date}</td><td>${order.items?.length || 0}</td><td><strong>${money(order.total)}</strong></td><td><span class="status ${order.status}">${order.status === "pending" ? "En cours" : "Confirmée"}</span></td></tr>`).join("") : `<tr><td colspan="7">Aucune commande pour ce vendeur.</td></tr>`;
}

function openInvoice(order, items) {
  document.querySelector("#invoice-content").innerHTML = `
    <div class="invoice-header"><div class="invoice-brand"><span class="brand-mark">M</span><strong>M'<em>Vente</em></strong></div><button class="close-invoice" type="button" aria-label="Fermer">×</button></div>
    <div class="invoice-meta"><div><span>FACTURE</span><strong>${order.id}</strong></div><div><span>Date</span><strong>${order.date}</strong></div></div>
    <div class="invoice-client"><span>CLIENT</span><strong>${order.client}</strong></div>
    <table class="invoice-table"><thead><tr><th>Produit</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>${items.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.price * item.quantity)}</td></tr>`).join("")}</tbody></table>
    <div class="invoice-total"><span>Total de la commande</span><strong>${money(order.total)}</strong></div>
    <div class="invoice-actions"><button class="primary-btn compact" id="print-invoice">Imprimer la facture</button><button class="text-btn close-invoice" type="button">Fermer</button></div>`;
  document.querySelector("#invoice-modal").classList.add("open");
  document.querySelector("#print-invoice").addEventListener("click", () => window.print());
  document.querySelectorAll(".close-invoice").forEach(button => button.addEventListener("click", closeInvoice));
}
function closeInvoice() {
  document.querySelector("#invoice-modal").classList.remove("open");
}

function renderAdminProducts() {
  document.querySelector("#products-table").innerHTML = products.map(product => `
    <tr><td class="customer">${product.image ? `<img class="product-thumb" src="${product.image}" alt="">` : product.emoji} ${product.name}<small>${product.detail}</small></td><td>${categories.find(category => category.id === product.category)?.name || product.category}</td><td>${money(product.price)}</td><td><input class="stock-input" type="number" min="0" value="${product.stock}" data-stock="${product.id}"></td><td><span class="status ${product.stock === 0 ? "pending" : "confirmed"}">${product.stock === 0 ? "Rupture" : "Disponible"}</span></td><td><button class="edit-btn" data-edit-product="${product.id}">Modifier</button> <button class="delete-btn" data-delete-product="${product.id}">Supprimer</button></td></tr>`).join("");
  document.querySelector("#admin-stock-total").textContent = products.reduce((sum, product) => sum + product.stock, 0);
}

function renderSellers() {
  document.querySelector("#sellers-table").innerHTML = sellers.map(seller => `
    <tr><td class="customer">${seller.name}</td><td>${seller.email}</td><td>${seller.created}</td><td><span class="status confirmed">Actif</span></td><td><button class="delete-btn" data-delete-seller="${seller.id}">Supprimer</button></td></tr>`).join("");
}

function activateView(button) {
  if (currentRole === "seller" && button.dataset.view !== "seller-view") return;
  document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
  button.classList.add("active");
  document.querySelector(`#${button.dataset.view}`).classList.add("active-view");
  const titles = { "dashboard-view": "Tableau de bord", "seller-view": "Nouvelle vente", "admin-view": "Administration" };
  document.querySelector("#page-title").textContent = titles[button.dataset.view];
  document.querySelector("#mobile-nav").classList.remove("open");
  if (button.dataset.view === "admin-view") renderOrders();
  if (button.dataset.view === "admin-view") renderSellerHistory();
}

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => activateView(button)));
document.querySelector("[data-go-to='seller-view']").addEventListener("click", () => activateView(document.querySelector("[data-view='seller-view']")));
document.querySelector("#mobile-menu-toggle").addEventListener("click", () => document.querySelector("#mobile-nav").classList.toggle("open"));

document.querySelectorAll(".category").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".category").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  currentCategory = button.dataset.category;
  renderProducts();
}));

productGrid.addEventListener("click", event => {
  const image = event.target.closest("[data-image-preview]");
  if (image) {
    document.querySelector("#expanded-product-image").src = image.dataset.imagePreview;
    document.querySelector("#expanded-product-image").alt = image.alt;
    document.querySelector("#image-modal").classList.add("open");
    return;
  }
  const card = event.target.closest("[data-add]");
  if (card) addProduct(Number(card.dataset.add));
});
function closeImageModal() {
  document.querySelector("#image-modal").classList.remove("open");
  document.querySelector("#expanded-product-image").src = "";
}
document.querySelector("#close-image-modal").addEventListener("click", closeImageModal);
document.querySelector("#image-modal").addEventListener("click", event => {
  if (event.target.id === "image-modal") closeImageModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeImageModal();
});
orderItems.addEventListener("click", event => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  if (increase) changeQuantity(Number(increase.dataset.increase), 1);
  if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1);
});
document.querySelector("#product-search").addEventListener("input", renderProducts);
document.querySelector("#clear-order").addEventListener("click", () => { cart = []; renderCart(); });
document.querySelector("#order-filter").addEventListener("change", renderOrders);
document.querySelector("#seller-order-filter").addEventListener("change", renderSellerOrders);
document.querySelector("#seller-history-filter").addEventListener("change", renderSellerHistory);
document.querySelectorAll(".admin-tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".admin-tab").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".admin-subpanel").forEach(panel => panel.classList.remove("active"));
  tab.classList.add("active");
  document.querySelector(`#${tab.dataset.adminPanel}`).classList.add("active");
  renderAdminProducts();
  renderSellers();
}));
function resetProductForm() {
  editingProductId = null;
  document.querySelector("#product-form").reset();
  document.querySelector("#product-submit").textContent = "Enregistrer";
  document.querySelector("#cancel-product-edit").classList.add("hidden");
}

document.querySelector("#add-product-toggle").addEventListener("click", () => {
  const form = document.querySelector("#product-form");
  if (!form.classList.contains("hidden")) {
    form.classList.add("hidden");
    resetProductForm();
    return;
  }
  resetProductForm();
  form.classList.remove("hidden");
});
document.querySelector("#product-form").addEventListener("submit", event => {
  event.preventDefault();
  const imageFile = document.querySelector("#new-product-image").files[0];
  const saveProduct = image => {
    const wasEditing = editingProductId !== null;
    const data = {
      name: document.querySelector("#new-product-name").value.trim(),
      detail: document.querySelector("#new-product-detail").value.trim(),
      price: Number(document.querySelector("#new-product-price").value),
      stock: Number(document.querySelector("#new-product-stock").value),
      category: document.querySelector("#new-product-category").value
    };
    if (editingProductId === null) products.push({ id: Date.now(), ...data, emoji: "📦", image });
    else {
      const product = products.find(item => item.id === editingProductId);
      Object.assign(product, data);
      if (imageFile) product.image = image;
    }
    saveState();
    resetProductForm();
    event.target.classList.add("hidden");
    renderAdminProducts();
    renderProducts();
    showToast(wasEditing ? "Produit modifié." : "Produit ajouté au catalogue.");
  };
  if (!imageFile) {
    const currentImage = editingProductId === null ? "" : products.find(item => item.id === editingProductId).image || "";
    saveProduct(currentImage);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => saveProduct(String(reader.result)));
  reader.readAsDataURL(imageFile);
});
document.querySelector("#cancel-product-edit").addEventListener("click", () => {
  resetProductForm();
  document.querySelector("#product-form").classList.add("hidden");
});
document.querySelector("#category-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.querySelector("#new-category-name").value.trim();
  const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id || categories.some(category => category.id === id)) {
    showToast("Cette catégorie existe déjà ou est invalide.");
    return;
  }
  categories.push({ id, name });
  saveState();
  event.target.reset();
  renderCategories();
  showToast("Catégorie ajoutée.");
});
document.querySelector("#category-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-category]");
  if (!button) return;
  const categoryId = button.dataset.deleteCategory;
  if (products.some(product => product.category === categoryId)) {
    showToast("Impossible de supprimer une catégorie utilisée par un produit.");
    return;
  }
  categories = categories.filter(category => category.id !== categoryId);
  if (currentCategory === categoryId) currentCategory = "all";
  saveState();
  renderCategories();
  renderProducts();
  showToast("Catégorie supprimée.");
});
document.querySelector("#products-table").addEventListener("change", event => {
  const input = event.target.closest("[data-stock]");
  if (!input) return;
  const product = products.find(item => item.id === Number(input.dataset.stock));
  product.stock = Math.max(0, Number(input.value));
  saveState();
  renderAdminProducts();
  renderProducts();
  showToast("Stock mis à jour.");
});
document.querySelector("#products-table").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const product = products.find(item => item.id === Number(editButton.dataset.editProduct));
    editingProductId = product.id;
    document.querySelector("#new-product-name").value = product.name;
    document.querySelector("#new-product-detail").value = product.detail;
    document.querySelector("#new-product-price").value = product.price;
    document.querySelector("#new-product-stock").value = product.stock;
    document.querySelector("#new-product-category").value = product.category;
    document.querySelector("#new-product-image").value = "";
    document.querySelector("#product-submit").textContent = "Enregistrer les modifications";
    document.querySelector("#cancel-product-edit").classList.remove("hidden");
    document.querySelector("#product-form").classList.remove("hidden");
    document.querySelector("#product-form").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const button = event.target.closest("[data-delete-product]");
  if (!button) return;
  const index = products.findIndex(product => product.id === Number(button.dataset.deleteProduct));
  products.splice(index, 1);
  saveState();
  renderAdminProducts();
  renderProducts();
  showToast("Produit supprimé.");
});
document.querySelector("#add-seller-toggle").addEventListener("click", () => document.querySelector("#seller-form").classList.toggle("hidden"));
document.querySelector("#seller-form").addEventListener("submit", event => {
  event.preventDefault();
  sellers.push({ id: Date.now(), name: document.querySelector("#new-seller-name").value.trim(), email: document.querySelector("#new-seller-email").value.trim(), created: "Aujourd'hui", password: document.querySelector("#new-seller-password").value });
  saveState();
  event.target.reset();
  event.target.classList.add("hidden");
  renderSellers();
  showToast("Compte vendeur créé.");
});
document.querySelector("#sellers-table").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-seller]");
  if (!button) return;
  sellers = sellers.filter(seller => seller.id !== Number(button.dataset.deleteSeller));
  saveState();
  renderSellers();
  showToast("Compte vendeur supprimé.");
});
document.querySelector("#orders-table").addEventListener("click", event => {
  const button = event.target.closest("[data-confirm]");
  if (!button) return;
  const order = orders.find(item => item.id === button.dataset.confirm);
  order.status = "confirmed";
  saveState();
  renderOrders();
  showToast(`${order.id} a été confirmée.`);
});
document.querySelector("#send-order").addEventListener("click", async () => {
  const client = document.querySelector("#client-name").value.trim() || "Client sans nom";
  const invoiceItems = cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, id: item.id }));
  const total = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = { id: `#MV-${Date.now().toString().slice(-8)}`, client, date: "07 nov. 2026 · à l'instant", total, status: "pending" };
  let response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
        order,
        items: invoiceItems
      })
    });
  } catch (error) {
    console.error(error);
    showToast("Serveur indisponible : la commande n'a pas été envoyée.");
    return;
  }
  if (!response.ok) {
    showToast("La commande n'a pas pu être enregistrée.");
    return;
  }
  openInvoice(order, invoiceItems);
  cart = [];
  document.querySelector("#client-name").value = "";
  renderCart();
  try {
    await loadServerState();
  } catch (error) {
    console.error(error);
    showToast("Commande envoyée, mais le rafraîchissement a échoué.");
  }
  showToast("Commande envoyée à l'administration.");
});
document.querySelector("#export-orders").addEventListener("click", () => showToast("Export prêt à être téléchargé."));
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  currentRole = null;
  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
  document.querySelector("#login-error").textContent = "";
}
document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector("#mobile-logout-button").addEventListener("click", logout);

document.querySelectorAll(".role-option input").forEach(input => input.addEventListener("change", () => {
  document.querySelectorAll(".role-option").forEach(option => option.classList.toggle("selected", option.querySelector("input").checked));
}));

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const role = document.querySelector("input[name='role']:checked").value;
  const email = document.querySelector("#login-email").value.trim();
  if (!email || !document.querySelector("#login-password").value) {
    document.querySelector("#login-error").textContent = "Veuillez renseigner vos identifiants.";
    return;
  }
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: document.querySelector("#login-password").value, role })
  });
  if (!response.ok) {
    document.querySelector("#login-error").textContent = "Identifiants invalides.";
    return;
  }
  const session = await response.json();
  currentRole = session.role;
  await loadServerState();
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  const isAdmin = currentRole === "admin";
  document.querySelector("#role-label").textContent = isAdmin ? "Administrateur" : "Vendeur";
  document.querySelector("#page-title").textContent = isAdmin ? "Administration" : "Nouvelle vente";
  document.querySelectorAll(".nav-link").forEach(link => {
    link.hidden = (isAdmin && link.dataset.view === "seller-view") || (!isAdmin && (link.dataset.view === "admin-view" || link.dataset.view === "dashboard-view"));
    link.classList.toggle("active", link.dataset.view === (isAdmin ? "admin-view" : "seller-view"));
  });
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active-view", view.id === (isAdmin ? "admin-view" : "seller-view")));
  document.querySelector("#admin-view").hidden = !isAdmin;
  document.querySelector("#dashboard-view").hidden = !isAdmin;
  document.querySelector("#seller-view").hidden = isAdmin;
  if (isAdmin) renderOrders();
});

renderProducts();
renderCategories();
renderCart();
renderOrders();
renderSellerOrders();
renderSellerHistory();
renderAdminProducts();
renderSellers();
