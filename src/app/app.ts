import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Product {
  id: number;
  name: string;
  detail: string;
  price: number;
  category: string;
  emoji: string;
  stock: number;
  image?: string;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  client: string;
  seller: string;
  date: string;
  total: number;
  status: 'pending' | 'confirmed';
  items?: OrderItem[];
}

interface Category {
  id: string;
  name: string;
}

interface Seller {
  id: number;
  name: string;
  email: string;
  created: string;
  password?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  loggedIn = false;
  role: 'admin' | 'seller' = 'seller';
  activePage = 'sales';
  activeAdminTab = 'orders';
  email = '';
  password = '';
  loginError = '';
  clientName = '';
  search = '';
  category = 'all';
  orderFilter = 'all';
  invoice: Order | null = null;
  imagePreview: Product | null = null;
  cart: OrderItem[] = [];
  products: Product[] = [];
  categories: Category[] = [];
  orders: Order[] = [];
  sellers: Seller[] = [];
  newProduct = { name: '', detail: '', price: 0, stock: 0, category: '', image: '' };
  newCategory = '';
  newSeller = { name: '', email: '', password: '' };
  loading = false;

  async login(): Promise<void> {
    this.loginError = '';
    this.loading = true;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password, role: this.role })
      });
      if (!response.ok) {
        this.loginError = 'Identifiants invalides.';
        return;
      }
      this.loggedIn = true;
      this.activePage = this.role === 'admin' ? 'dashboard' : 'sales';
      await this.loadState();
    } catch {
      this.loginError = 'Serveur indisponible.';
    } finally {
      this.loading = false;
    }
  }

  async logout(): Promise<void> {
    await fetch('/api/logout', { method: 'POST' });
    this.loggedIn = false;
    this.email = '';
    this.password = '';
    this.cart = [];
    this.invoice = null;
    this.imagePreview = null;
  }

  async loadState(): Promise<void> {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Session requise');
    const state = await response.json();
    this.products = state.products ?? [];
    this.categories = state.categories ?? [];
    this.orders = state.orders ?? [];
    this.sellers = state.sellers ?? [];
    if (!this.newProduct.category) this.newProduct.category = this.categories[0]?.id ?? '';
  }

  get visibleProducts(): Product[] {
    const query = this.search.toLowerCase();
    return this.products.filter(product =>
      (this.category === 'all' || product.category === this.category) &&
      `${product.name} ${product.detail}`.toLowerCase().includes(query)
    );
  }

  get sellerOrders(): Order[] {
    return this.orders.filter(order => this.orderFilter === 'all' || order.status === this.orderFilter);
  }

  get total(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  money(value: number): string {
    return `${value.toFixed(2).replace('.', ',')} DH`;
  }

  addToCart(product: Product): void {
    const item = this.cart.find(cartItem => cartItem.id === product.id);
    if ((item?.quantity ?? 0) >= product.stock) return;
    if (item) item.quantity++;
    else this.cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  }

  openImage(product: Product): void {
    if (product.image) this.imagePreview = product;
  }

  changeQuantity(item: OrderItem, amount: number): void {
    item.quantity += amount;
    if (item.quantity <= 0) this.cart = this.cart.filter(cartItem => cartItem !== item);
  }

  async sendOrder(): Promise<void> {
    if (!this.cart.length) return;
    const order: Order = {
      id: `#MV-${Date.now().toString().slice(-8)}`,
      client: this.clientName.trim() || 'Client sans nom',
      seller: this.email,
      date: new Date().toLocaleString('fr-FR'),
      total: this.total,
      status: 'pending',
      items: this.cart.map(item => ({ ...item }))
    };
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order, items: order.items })
    });
    if (!response.ok) return;
    this.invoice = order;
    this.cart = [];
    this.clientName = '';
    await this.loadState();
  }

  async saveAdminState(): Promise<void> {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ products: this.products, categories: this.categories, orders: this.orders, sellers: this.sellers })
    });
  }

  async addProduct(): Promise<void> {
    if (!this.newProduct.name || !this.newProduct.category) return;
    this.products.push({ id: Date.now(), ...this.newProduct, price: Number(this.newProduct.price), stock: Number(this.newProduct.stock), emoji: '📦' });
    this.newProduct = { name: '', detail: '', price: 0, stock: 0, category: this.categories[0]?.id ?? '', image: '' };
    await this.saveAdminState();
  }

  async deleteProduct(product: Product): Promise<void> {
    this.products = this.products.filter(item => item.id !== product.id);
    await this.saveAdminState();
  }

  async addCategory(): Promise<void> {
    const name = this.newCategory.trim();
    const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    if (!id || this.categories.some(category => category.id === id)) return;
    this.categories.push({ id, name });
    this.newCategory = '';
    this.newProduct.category ||= id;
    await this.saveAdminState();
  }

  async addSeller(): Promise<void> {
    if (!this.newSeller.name || !this.newSeller.email || !this.newSeller.password) return;
    this.sellers.push({ id: Date.now(), ...this.newSeller, created: new Date().toLocaleDateString('fr-FR') });
    this.newSeller = { name: '', email: '', password: '' };
    await this.saveAdminState();
  }

  async deleteSeller(seller: Seller): Promise<void> {
    this.sellers = this.sellers.filter(item => item.id !== seller.id);
    await this.saveAdminState();
  }

  print(): void {
    window.print();
  }

  filteredHistory(seller: string): Order[] {
    return this.orders.filter(order => !seller || order.seller === seller);
  }

  async confirm(order: Order): Promise<void> {
    order.status = 'confirmed';
    await this.saveAdminState();
  }
}
