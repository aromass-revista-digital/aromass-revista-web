import { CartItem, Order, OrderCustomer, Product, Reseller } from '../types.ts';
import { CURRENT_CAMPAIGN, DEFAULT_WHATSAPP_CONFIG, DEMO_RESELLERS, PRODUCTS } from '../data/catalog.ts';

const CART_STORAGE_KEY = 'aromass_cart_items_v1';
const RESELLER_STORAGE_KEY = 'aromass_reseller_code_v1';
const ORDERS_STORAGE_KEY = 'aromass_demo_orders_v1';
const WA_CONFIG_KEY = 'aromass_wa_config_v1';

export class Store {
  private cart: CartItem[] = [];
  private activeReseller: Reseller;
  private orders: Order[] = [];
  private whatsappConfig = { ...DEFAULT_WHATSAPP_CONFIG };
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeReseller = this.detectInitialReseller();
    this.loadCart();
    this.loadOrders();
    this.loadWhatsappConfig();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Reseller Detection & Management ---
  private detectInitialReseller(): Reseller {
    // 1. Chequear parámetro de URL (?revendedor=AR001 o ?r=AR001)
    const urlParams = new URLSearchParams(window.location.search);
    const paramCode = urlParams.get('revendedor') || urlParams.get('r');

    if (paramCode) {
      const match = DEMO_RESELLERS.find(
        (r) => r.code.toLowerCase() === paramCode.toLowerCase()
      );
      if (match) {
        localStorage.setItem(RESELLER_STORAGE_KEY, match.code);
        return match;
      } else {
        // Código personalizado del enlace
        const customReseller: Reseller = {
          code: paramCode.toUpperCase(),
          name: `Revendedor Enlace (${paramCode.toUpperCase()})`,
          phone: '+54 9 11 0000-0000',
          zone: 'Asignado por Enlace Web',
          active: true,
          level: 'Asesor Independiente',
        };
        localStorage.setItem(RESELLER_STORAGE_KEY, customReseller.code);
        return customReseller;
      }
    }

    // 2. Chequear localStorage
    const savedCode = localStorage.getItem(RESELLER_STORAGE_KEY);
    if (savedCode) {
      const match = DEMO_RESELLERS.find((r) => r.code === savedCode);
      if (match) return match;
    }

    // 3. Fallback al código de ejemplo obligatorio AR001
    return DEMO_RESELLERS[0];
  }

  public setReseller(code: string) {
    const match = DEMO_RESELLERS.find((r) => r.code === code);
    if (match) {
      this.activeReseller = match;
      localStorage.setItem(RESELLER_STORAGE_KEY, match.code);
    } else {
      this.activeReseller = {
        code: code.toUpperCase(),
        name: `Revendedor ${code.toUpperCase()}`,
        phone: '+54 9 11 0000-0000',
        zone: 'Zona Personalizada',
        active: true,
        level: 'Asesor',
      };
      localStorage.setItem(RESELLER_STORAGE_KEY, code.toUpperCase());
    }
    this.notify();
  }

  public getReseller(): Reseller {
    return this.activeReseller;
  }

  public getAllResellers(): Reseller[] {
    return DEMO_RESELLERS;
  }

  // --- Cart Management ---
  private loadCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      if (data) {
        this.cart = JSON.parse(data);
      }
    } catch {
      this.cart = [];
    }
  }

  private saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
  }

  public getCart(): CartItem[] {
    return this.cart;
  }

  public getCartCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  public getSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  public getTotalPoints(): number {
    return this.cart.reduce((sum, item) => sum + item.product.points * item.quantity, 0);
  }

  public addToCart(product: Product, quantity: number = 1) {
    const existing = this.cart.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({ product, quantity });
    }
    this.saveCart();
    this.notify();
  }

  public updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.cart.find((i) => i.product.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.notify();
    }
  }

  public removeFromCart(productId: string) {
    this.cart = this.cart.filter((item) => item.product.id !== productId);
    this.saveCart();
    this.notify();
  }

  public clearCart() {
    this.cart = [];
    this.saveCart();
    this.notify();
  }

  // --- WhatsApp & Order Creation ---
  private loadOrders() {
    try {
      const data = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (data) {
        this.orders = JSON.parse(data);
      } else {
        // Cargar un pedido de demostración inicial para que el panel de administración
        // nunca aparezca vacío y Ángel pueda auditarlo de inmediato.
        this.orders = [
          {
            id: 'ORD-DEMO-901',
            date: new Date(Date.now() - 3600000 * 5).toLocaleString('es-AR'),
            customer: {
              fullName: 'Mariana Giménez',
              whatsapp: '+54 9 11 4455-8899',
              city: 'San Isidro, Buenos Aires',
              address: 'Av. Libertador 1420, Piso 4',
              notes: 'Dejar en conserjería si no respondo el timbre.',
            },
            resellerCode: 'AR001',
            resellerName: 'Estudio Aroma Norte',
            items: [
              { product: PRODUCTS[0], quantity: 2 },
              { product: PRODUCTS[1], quantity: 1 },
            ],
            subtotal: 8900 * 2 + 11400,
            totalDiscount: 0,
            totalAmount: 29200,
            totalPoints: 25 * 2 + 35,
            status: 'enviado_whatsapp',
          },
        ];
        this.saveOrders();
      }
    } catch {
      this.orders = [];
    }
  }

  private saveOrders() {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
  }

  public getOrders(): Order[] {
    return this.orders;
  }

  private loadWhatsappConfig() {
    try {
      const data = localStorage.getItem(WA_CONFIG_KEY);
      if (data) {
        this.whatsappConfig = { ...this.whatsappConfig, ...JSON.parse(data) };
      }
    } catch {
      // Usar defaults
    }
  }

  public getWhatsappConfig() {
    return this.whatsappConfig;
  }

  public setWhatsappConfig(phone: string, name: string) {
    this.whatsappConfig.recipientPhone = phone.replace(/\D/g, '');
    this.whatsappConfig.recipientName = name;
    this.whatsappConfig.isConfigured = true;
    localStorage.setItem(WA_CONFIG_KEY, JSON.stringify(this.whatsappConfig));
    this.notify();
  }

  public generateWhatsAppMessage(customer: OrderCustomer): { message: string; waUrl: string } {
    const subtotal = this.getSubtotal();
    const totalPoints = this.getTotalPoints();
    const reseller = this.getReseller();

    const lines: string[] = [];
    lines.push(`🌿 *PEDIDO AROMASS — REVISTA DIGITAL*`);
    lines.push(`📅 *Campaña:* ${CURRENT_CAMPAIGN.number} — ${CURRENT_CAMPAIGN.name}`);
    lines.push(`🏷️ *Código de Revendedor:* ${reseller.code} (${reseller.name})`);
    lines.push(``);
    lines.push(`👤 *DATOS DEL CLIENTE:*`);
    lines.push(`• *Nombre:* ${customer.fullName}`);
    lines.push(`• *WhatsApp:* ${customer.whatsapp}`);
    lines.push(`• *Localidad:* ${customer.city}`);
    if (customer.address.trim()) {
      lines.push(`• *Dirección de Entrega:* ${customer.address}`);
    }
    if (customer.notes.trim()) {
      lines.push(`• *Observaciones:* ${customer.notes}`);
    }
    lines.push(``);
    lines.push(`📦 *DETALLE DE PRODUCTOS:*`);
    this.cart.forEach((item, index) => {
      const itemSubtotal = item.product.price * item.quantity;
      lines.push(
        `${index + 1}. *${item.product.name}* (${item.product.volume})\n   Cant: ${item.quantity} x $${item.product.price.toLocaleString('es-AR')} = *$${itemSubtotal.toLocaleString('es-AR')}* [${item.product.points * item.quantity} pts]`
      );
    });
    lines.push(``);
    lines.push(`💰 *TOTAL ESTIMADO:* $${subtotal.toLocaleString('es-AR')}`);
    lines.push(`✨ *PUNTOS ACUMULADOS:* ${totalPoints} puntos`);
    lines.push(``);
    lines.push(
      `_Mensaje generado automáticamente desde la Revista Digital Interactiva Aromass. Pendiente de confirmación y coordinación con el revendedor._`
    );

    const fullMessage = lines.join('\n');
    const cleanPhone = this.whatsappConfig.recipientPhone.replace(/\D/g, '');
    const encoded = encodeURIComponent(fullMessage);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    return { message: fullMessage, waUrl };
  }

  public recordOrder(customer: OrderCustomer): Order {
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString('es-AR'),
      customer,
      resellerCode: this.activeReseller.code,
      resellerName: this.activeReseller.name,
      items: [...this.cart],
      subtotal: this.getSubtotal(),
      totalDiscount: 0,
      totalAmount: this.getSubtotal(),
      totalPoints: this.getTotalPoints(),
      status: 'enviado_whatsapp',
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    this.notify();
    return newOrder;
  }
}

export const store = new Store();
