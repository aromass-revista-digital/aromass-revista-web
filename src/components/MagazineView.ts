import { CATEGORIES, CURRENT_CAMPAIGN, POINTS_LEVELS, PRODUCTS } from '../data/catalog.ts';
import { imageStorage } from '../services/imageStorage.ts';
import { store } from '../services/store.ts';
import { OrderCustomer, Product } from '../types.ts';

// Carga diferida de ThreeShowroom para que Three.js NO se descargue en el inicio
let ThreeShowroomClass: any = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export class MagazineView {
  private container: HTMLElement;
  private selectedCategory = 'todas';
  private searchQuery = '';
  private sortBy = 'featured';
  private onlyPromos = false;
  private selectedProductForModal: Product | null = null;
  private isCartOpen = false;
  private isCheckoutOpen = false;
  private is3DModalOpen = false;
  private isAdminOpen = false;
  private isResellerModalOpen = false;
  private isMenuDrawerOpen = false;
  private isImageUploadModalOpen = false;
  private uploadTargetProduct: Product | null = null;
  private activeTourStep = 0;
  private isTourVisible = false; // Minimizado por defecto para no tapar la pantalla
  private showroomInstance: any = null;
  private customImages: Map<string, string> = new Map();

  // PWA Install state
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private isAppInstalled = false;
  private isIOS = false;

  constructor(container: HTMLElement) {
    this.container = container;
    store.subscribe(() => {
      this.render();
    });

    // Detectar si ya está en modo standalone PWA
    this.isAppInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // Detectar iOS
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIOS = /iphone|ipad|ipod/.test(ua);

    // Capturar evento PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e as BeforeInstallPromptEvent;
      this.render();
    });

    window.addEventListener('appinstalled', () => {
      this.isAppInstalled = true;
      this.deferredInstallPrompt = null;
      this.showToast('¡App AROMASS instalada con éxito!');
      this.render();
    });
  }

  public async init() {
    // Cargar fotos personalizadas desde IndexedDB
    await this.loadAllCustomImages();
    this.render();
  }

  private async loadAllCustomImages() {
    for (const p of PRODUCTS) {
      try {
        const stored = await imageStorage.getProductImage(p.id);
        if (stored) {
          this.customImages.set(p.id, stored);
        }
      } catch {
        // Ignorar si no hay foto guardada
      }
    }
  }

  private getProductImageSrc(product: Product): string {
    return this.customImages.get(product.id) || product.image;
  }

  private getFilteredProducts(): Product[] {
    return PRODUCTS.filter((product) => {
      if (this.selectedCategory !== 'todas' && product.category !== this.selectedCategory) {
        return false;
      }
      if (this.onlyPromos && !product.isPromo) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(query);
        const matchDesc = product.description.toLowerCase().includes(query);
        const matchFamily = product.olfactoryFamily.toLowerCase().includes(query);
        const matchCode = product.code.toLowerCase().includes(query);
        const matchNotes =
          product.notes.top.toLowerCase().includes(query) ||
          product.notes.heart.toLowerCase().includes(query) ||
          product.notes.base.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchFamily && !matchCode && !matchNotes) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (this.sortBy === 'price-asc') return a.price - b.price;
      if (this.sortBy === 'price-desc') return b.price - a.price;
      if (this.sortBy === 'points-desc') return b.points - a.points;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });
  }

  public showToast(message: string) {
    const existing = document.getElementById('aromassToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'aromassToast';
    toast.className = 'toast-notice show';
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  public render() {
    const reseller = store.getReseller();
    const cartCount = store.getCartCount();
    const subtotal = store.getSubtotal();
    const totalPoints = store.getTotalPoints();
    const filteredProducts = this.getFilteredProducts();

    this.container.innerHTML = `
      <!-- ENCABEZADO PRINCIPAL (Mobile-First 100% probado en 360 px) -->
      <header style="position: sticky; top: 0; z-index: 40; background: rgba(250, 248, 245, 0.96); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border);" class="safe-top">
        
        <!-- Fila 1: Logo + Acciones Principales (No se desborda en 360px) -->
        <div style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 14px; max-width: 1200px; margin: 0 auto; gap: 8px;">
          
          <!-- Logo de Marca -->
          <a href="#" id="brandLogoLink" style="text-decoration: none; display: flex; align-items: baseline; gap: 6px; shrink: 0;">
            <span style="font-family: var(--font-serif); font-size: 21px; font-weight: 700; letter-spacing: 0.1em; color: var(--color-text-main); line-height: 1;">AROMASS</span>
            <span style="font-size: 10px; font-weight: 600; letter-spacing: 0.15em; color: var(--color-amber-primary); text-transform: uppercase;">Revista</span>
          </a>

          <!-- Botones de Acción Derecha (Carrito + Menú/Opciones) -->
          <div style="display: flex; align-items: center; gap: 6px;">
            ${
              this.deferredInstallPrompt && !this.isAppInstalled
                ? `<button id="pwaInstallHeaderBtn" class="btn btn-amber" style="min-height: 36px; padding: 4px 10px; font-size: 11px; border-radius: var(--radius-sm);" title="Instalar en tu teléfono">📲 Instalar</button>`
                : ''
            }

            <!-- Botón del Carrito -->
            <button id="openCartTopBtn" class="btn btn-primary" style="min-height: 38px; padding: 4px 12px; font-size: 12px; gap: 6px; border-radius: var(--radius-sm);">
              <span>🛒</span>
              <span style="font-weight: 700; background: var(--color-amber-accent); padding: 1px 6px; border-radius: 999px; font-size: 11px;">${cartCount}</span>
              ${cartCount > 0 ? `<span class="tabular-nums" style="display: none; @media(min-width: 480px){ display: inline; } font-size: 12px;">$${subtotal.toLocaleString('es-AR')}</span>` : ''}
            </button>

            <!-- Botón Menú Hamburguesa -->
            <button id="openMenuDrawerBtn" class="btn btn-outline" style="min-height: 38px; min-width: 38px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: var(--radius-sm);" title="Abrir menú de opciones">
              ☰
            </button>
          </div>
        </div>

        <!-- Fila 2: Sub-header compacto con Revendedor y Acceso a la Guía -->
        <div style="background: var(--color-surface-subtle); border-top: 1px solid var(--color-border); padding: 6px 14px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; gap: 8px;">
          <!-- Chip de Revendedor -->
          <button id="openResellerModalBtn" style="background: none; border: none; padding: 0; display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--color-text-main); font-family: var(--font-sans); text-align: left; overflow: hidden;" title="Click para cambiar revendedor o copiar enlace">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #16A34A; display: inline-block; shrink: 0;"></span>
            <span style="font-weight: 700; color: var(--color-text-main);">${reseller.code}</span>
            <span style="color: var(--color-text-muted); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 140px;">· ${reseller.name.split(':')[1] || reseller.name}</span>
            <span style="font-size: 11px; color: var(--color-amber-accent); font-weight: 600; shrink: 0;">(Cambiar)</span>
          </button>

          <!-- Botón Tour Ángel -->
          <button id="toggleTourCompactBtn" style="background: #FFFFFF; border: 1px solid var(--color-border); padding: 3px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; color: var(--color-text-main); cursor: pointer; shrink: 0; display: flex; align-items: center; gap: 4px;">
            <span>👁️ Guía Ángel</span>
            <span style="color: var(--color-amber-primary);">(${this.activeTourStep + 1}/10)</span>
          </button>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main style="padding-bottom: 84px;">
        <div class="container-narrow" style="padding-top: 14px;">
          
          <!-- BANNER GUIADO PARA ÁNGEL (Plegable, minimizado por defecto) -->
          ${this.renderTourBanner()}

          <!-- PORTADA DE LA REVISTA DIGITAL (Estilo Catálogo Sensorial) -->
          <section id="portada" style="margin-bottom: 28px; border-radius: var(--radius-lg); overflow: hidden; background: #FFFFFF; border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);">
            <div style="display: grid; grid-template-columns: 1fr; @media (min-width: 800px) { grid-template-columns: 1.1fr 0.9fr; }">
              
              <!-- Imagen de Campaña con Fallback Resiliente -->
              <div style="position: relative; min-height: 220px; max-height: 380px; background: var(--color-sand); overflow: hidden;">
                <img 
                  src="${CURRENT_CAMPAIGN.bannerImage}" 
                  alt="${CURRENT_CAMPAIGN.name}" 
                  loading="eager"
                  width="800"
                  height="450"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                  referrerpolicy="no-referrer"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <!-- Fallback en caso de desconexión o fallo -->
                <div class="product-image-fallback" style="display: none;">
                  <span style="font-size: 40px; margin-bottom: 8px;">🌸</span>
                  <span style="font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--color-text-main);">AROMASS</span>
                  <span style="font-size: 13px; color: var(--color-text-muted); margin-top: 4px;">${CURRENT_CAMPAIGN.name}</span>
                </div>

                <div style="position: absolute; top: 12px; left: 12px; background: rgba(28, 25, 23, 0.88); backdrop-filter: blur(8px); color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;">
                  CAMPAÑA ${CURRENT_CAMPAIGN.number}
                </div>
              </div>

              <!-- Bloque Editorial de la Portada -->
              <div style="padding: 24px 18px; display: flex; flex-direction: column; justify-content: center; gap: 12px; background: #FFFFFF;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-amber-primary); font-weight: 600;">
                  <span>Edición Vigente</span>
                  <span aria-hidden="true">·</span>
                  <span>Hasta ${CURRENT_CAMPAIGN.endDate}</span>
                </div>

                <h1 style="font-size: clamp(22px, 3.5vw, 32px); line-height: 1.2; color: var(--color-text-main);">
                  ${CURRENT_CAMPAIGN.name}
                </h1>

                <p style="font-size: 14px; color: var(--color-text-muted); line-height: 1.45;">
                  ${CURRENT_CAMPAIGN.slogan}
                </p>

                <!-- Aviso de Fecha Límite -->
                <div style="background: var(--color-surface-subtle); border-left: 3px solid var(--color-amber-accent); padding: 10px 14px; border-radius: 4px; font-size: 12px; color: var(--color-text-main);">
                  <strong>Cierre de Pedidos:</strong> ${CURRENT_CAMPAIGN.orderDeadline}
                  <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">
                    Los pedidos se envían directamente por WhatsApp a tu revendedor asignado.
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px;">
                  <a href="#catalogo" class="btn btn-amber" style="text-decoration: none; flex: 1; min-width: 160px; font-size: 13px;">
                    Explorar Catálogo
                  </a>
                  <button id="openShowroomCoverBtn" class="btn btn-outline" style="flex: 1; min-width: 160px; font-size: 13px;">
                    ✨ Showroom 3D
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- BUSCADOR, CATEGORÍAS Y FILTROS -->
          <section id="catalogo" style="margin-bottom: 24px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              
              <!-- Buscador Rápido -->
              <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
                <div style="position: relative; flex: 1; min-width: 220px;">
                  <input 
                    type="text" 
                    id="catalogSearchInput" 
                    placeholder="Buscar fragancia, notas de sándalo, difusor..." 
                    value="${this.searchQuery}"
                    style="width: 100%; height: 44px; padding: 0 16px 0 38px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: #FFFFFF; font-family: var(--font-sans); font-size: 14px; color: var(--color-text-main); outline: none;"
                  />
                  <span style="position: absolute; left: 14px; top: 13px; color: var(--color-text-light); pointer-events: none;">🔍</span>
                  ${
                    this.searchQuery
                      ? `<button id="clearSearchBtn" style="position: absolute; right: 12px; top: 12px; background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 16px;">✕</button>`
                      : ''
                  }
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; cursor: pointer; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid ${this.onlyPromos ? 'var(--color-amber-accent)' : 'var(--color-border)'}; background: ${this.onlyPromos ? 'var(--color-amber-soft)' : '#FFFFFF'};">
                    <input type="checkbox" id="promoOnlyCheckbox" ${this.onlyPromos ? 'checked' : ''} style="cursor: pointer;" />
                    <span>Promos</span>
                  </label>

                  <select id="sortBySelect" style="height: 42px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: #FFFFFF; font-family: var(--font-sans); font-size: 12px; color: var(--color-text-main); cursor: pointer; outline: none;">
                    <option value="featured" ${this.sortBy === 'featured' ? 'selected' : ''}>Destacados</option>
                    <option value="price-asc" ${this.sortBy === 'price-asc' ? 'selected' : ''}>Precio: Menor</option>
                    <option value="price-desc" ${this.sortBy === 'price-desc' ? 'selected' : ''}>Precio: Mayor</option>
                    <option value="points-desc" ${this.sortBy === 'points-desc' ? 'selected' : ''}>Más Puntos</option>
                  </select>
                </div>
              </div>

              <!-- Pestañas Horizontales de Categorías -->
              <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
                ${CATEGORIES.map(
                  (cat) => `
                  <button 
                    class="category-tab-btn" 
                    data-category-id="${cat.id}"
                    style="white-space: nowrap; padding: 7px 14px; border-radius: var(--radius-md); border: 1px solid ${this.selectedCategory === cat.id ? 'var(--color-text-main)' : 'var(--color-border)'}; background: ${this.selectedCategory === cat.id ? 'var(--color-text-main)' : '#FFFFFF'}; color: ${this.selectedCategory === cat.id ? '#FFFFFF' : 'var(--color-text-main)'}; font-family: var(--font-sans); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;"
                  >
                    ${cat.label}
                  </button>
                `
                ).join('')}
              </div>

            </div>
          </section>

          <!-- LISTADO DE PRODUCTOS (Actualizado dinámicamente) -->
          <section style="margin-bottom: 44px;">
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px;">
              <h2 style="font-size: 20px; color: var(--color-text-main);">
                ${this.getCategoryTitle()}
              </h2>
              <span id="productsCountLabel" style="font-size: 12px; color: var(--color-text-muted);">
                ${filteredProducts.length} productos
              </span>
            </div>

            <div id="productsGridContainer">
              ${this.renderProductsListHTML(filteredProducts)}
            </div>
          </section>

          <!-- SECCIÓN: PROGRAMA DE PUNTOS Y METAS -->
          <section id="puntos" style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 24px 18px; margin-bottom: 44px;">
            <div style="max-width: 720px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--color-amber-primary); letter-spacing: 0.12em; text-transform: uppercase;">
                  PROGRAMA DE BENEFICIOS AROMASS
                </span>
                <h2 style="font-size: 24px; margin-top: 4px; color: var(--color-text-main);">
                  Acumulación de Puntos Comerciales
                </h2>
                <p style="font-size: 13px; color: var(--color-text-muted); margin-top: 4px;">
                  Los puntos son independientes del precio en pesos y te permiten acceder a incentivos especiales.
                </p>
              </div>

              <!-- Puntos actuales -->
              <div style="background: var(--color-surface-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; border: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 13px; font-weight: 600;">Puntos en tu pedido actual:</span>
                  <span style="font-size: 17px; font-weight: 700; color: var(--color-amber-primary);" class="tabular-nums">
                    ${totalPoints} puntos
                  </span>
                </div>
                
                <div class="points-bar-bg">
                  <div class="points-bar-fill" style="width: ${Math.min(100, (totalPoints / 85) * 100)}%;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--color-text-muted); margin-top: 6px;">
                  <span>0 pts</span>
                  <span>Nivel 1 (35 pts)</span>
                  <span>Nivel 2 (60 pts)</span>
                  <span>Nivel 3 (85 pts)</span>
                </div>
              </div>

              <!-- Grilla de Niveles -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                ${POINTS_LEVELS.map(
                  (lvl) => `
                  <div style="padding: 14px; border-radius: var(--radius-sm); border: 1px solid ${totalPoints >= lvl.points ? 'var(--color-amber-accent)' : 'var(--color-border)'}; background: ${totalPoints >= lvl.points ? 'var(--color-amber-soft)' : '#FAFAF9'};">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                      <span style="font-weight: 700; font-size: 14px; color: var(--color-text-main);">${lvl.title}</span>
                      ${totalPoints >= lvl.points ? `<span style="color: #16A34A; font-size: 12px; font-weight: 700;">✓ Alcanzado</span>` : `<span style="color: var(--color-text-light); font-size: 11px;">Faltan ${lvl.points - totalPoints} pts</span>`}
                    </div>
                    <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.35;">
                      ${lvl.benefit}
                    </p>
                  </div>
                `
                ).join('')}
              </div>

              <div style="margin-top: 14px; text-align: center; font-size: 11px; color: var(--color-text-light);">
                * Los beneficios son incentivos de demostración sujetos a confirmación de política comercial Aromass.
              </div>
            </div>
          </section>

          <!-- FOOTER -->
          <footer style="border-top: 1px solid var(--color-border); padding: 28px 0 16px 0; text-align: center; color: var(--color-text-muted); font-size: 12px;">
            <div style="font-family: var(--font-serif); font-size: 18px; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">
              AROMASS
            </div>
            <p style="margin-bottom: 10px;">
              Revista Digital Interactiva & Sistema de Comercialización por Catálogo
            </p>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
              <span>Revendedor: <strong>${reseller.code} — ${reseller.name}</strong></span>
              <span>·</span>
              <button id="footerAdminBtn" style="background: none; border: none; color: var(--color-amber-primary); font-size: 12px; cursor: pointer; text-decoration: underline;">
                Panel de Demostración
              </button>
            </div>
            <div style="font-size: 11px; color: var(--color-text-light);">
              PWA Instalable con soporte offline y sincronización por WhatsApp.
            </div>
          </footer>

        </div>
      </main>

      <!-- BARRA DE NAVEGACIÓN INFERIOR MÓVIL (Touch Targets >= 44px) -->
      <nav class="bottom-nav safe-bottom">
        <a href="#portada" class="nav-item ${this.selectedCategory === 'todas' ? 'active' : ''}">
          <span style="font-size: 17px;">📖</span>
          <span>Revista</span>
        </a>
        <a href="#catalogo" class="nav-item">
          <span style="font-size: 17px;">🌿</span>
          <span>Catálogo</span>
        </a>
        <button id="bottomNavCartBtn" class="nav-item">
          <span style="font-size: 17px; position: relative;">
            🛒
            ${cartCount > 0 ? `<span class="badge-count">${cartCount}</span>` : ''}
          </span>
          <span>Carrito</span>
        </button>
        <button id="bottomNav3DBtn" class="nav-item">
          <span style="font-size: 17px;">✨</span>
          <span>Showroom 3D</span>
        </button>
        <button id="bottomNavMenuBtn" class="nav-item">
          <span style="font-size: 17px;">☰</span>
          <span>Menú</span>
        </button>
      </nav>

      <!-- CAJÓN / MENÚ LATERAL (DRAWER) -->
      ${this.renderSideDrawer()}

      <!-- MODALES DE LA APLICACIÓN -->
      ${this.renderProductDetailModal()}
      ${this.renderCartModal()}
      ${this.renderCheckoutModal()}
      ${this.render3DShowroomModal()}
      ${this.renderAdminModal()}
      ${this.renderResellerModal()}
      ${this.renderImageUploadModal()}
    `;

    this.attachEventListeners();
  }

  private renderTourBanner(): string {
    const steps = [
      { num: 1, title: 'Acceso y Revendedor', desc: 'El cliente entra mediante enlace o QR con el código del revendedor asignado (?revendedor=AR001).' },
      { num: 2, title: 'Portada y Campaña', desc: 'Campaña 01/2026 vigente, fecha límite de pedidos y promociones destacadas de temporada.' },
      { num: 3, title: 'Exploración y Filtros', desc: 'Filtros rápidos por familias olfativas, difusores, repuestos, textil y combos.' },
      { num: 4, title: 'Precios y Puntos', desc: 'Cada producto indica su precio en pesos y los puntos comerciales que acumula el pedido.' },
      { num: 5, title: 'Ficha y Fotos Propias', desc: 'Notas de salida, corazón y fondo. Posibilidad de subir fotos reales tomadas desde el celular.' },
      { num: 6, title: 'Showroom 3D Ligero', desc: 'Visor de la botella con atomización de bruma, cargado solo a demanda sin ralentizar la app.' },
      { num: 7, title: 'Carrito Inteligente', desc: 'Cálculo de subtotales, totales y barra de incentivo de puntos para subir de nivel.' },
      { num: 8, title: 'Formulario de Cliente', desc: 'Nombre, WhatsApp, localidad y entrega sin registro forzoso ni contraseñas.' },
      { num: 9, title: 'Generación WhatsApp', desc: 'Mensaje estructurado con los productos, totales y código de revendedor listo para enviar.' },
      { num: 10, title: 'Panel de Demostración', desc: 'Auditoría de pedidos simulados, revendedores y configuración comercial para Ángel.' },
    ];

    const current = steps[this.activeTourStep];

    // Estado Plegado (Compacto)
    if (!this.isTourVisible) {
      return `
        <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-main); overflow: hidden;">
            <span style="background: var(--color-amber-primary); color: #FFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Paso ${current.num}/10</span>
            <span style="font-weight: 600; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${current.title}</span>
          </div>
          <button id="expandTourBtn" style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; color: var(--color-amber-primary); cursor: pointer; shrink: 0;">
            Ver Guía ▼
          </button>
        </div>
      `;
    }

    // Estado Desplegado (Completo pero controlado)
    return `
      <div class="tour-banner" style="margin-bottom: 18px; padding: 14px 16px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="background: var(--color-amber-accent); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                Demostración para Ángel
              </span>
              <span style="font-size: 11px; color: #D4C7BA;">Paso ${current.num} de 10</span>
            </div>
            <button id="collapseTourBtn" style="background: none; border: none; color: #E7E5E4; cursor: pointer; font-size: 12px; text-decoration: underline;">
              Plegar ▲
            </button>
          </div>

          <h3 style="font-size: 15px; color: #FFFFFF; margin-bottom: 2px;">
            ${current.num}. ${current.title}
          </h3>
          <p style="font-size: 12px; color: #E7E5E4; line-height: 1.35;">
            ${current.desc}
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; @media(min-width: 768px){ margin-top: 0; }">
          <button id="tourPrevBtn" class="btn btn-outline" style="min-height: 32px; padding: 4px 10px; font-size: 11px; background: rgba(255, 255, 255, 0.1); color: #FFF; border-color: rgba(255, 255, 255, 0.2);" ${this.activeTourStep === 0 ? 'disabled' : ''}>
            Anterior
          </button>
          <button id="tourNextBtn" class="btn btn-amber" style="min-height: 32px; padding: 4px 12px; font-size: 11px;">
            ${this.activeTourStep === 9 ? 'Reiniciar' : 'Siguiente Paso →'}
          </button>
        </div>
      </div>
    `;
  }

  private renderProductsListHTML(products: Product[]): string {
    if (products.length === 0) {
      return `
        <div style="text-align: center; padding: 48px 16px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
          <div style="font-size: 32px; margin-bottom: 8px;">🌿</div>
          <h3 style="font-size: 16px; margin-bottom: 6px;">No se encontraron productos</h3>
          <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 14px;">
            Probá buscando con otro aroma o cambiá de categoría.
          </p>
          <button id="resetFiltersBtn" class="btn btn-outline" style="font-size: 12px; padding: 6px 14px;">Restablecer Filtros</button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
        ${products.map((p) => this.renderProductCard(p)).join('')}
      </div>
    `;
  }

  private renderProductCard(product: Product): string {
    const isPromo = Boolean(product.isPromo);
    const imgSrc = this.getProductImageSrc(product);
    const hasCustomImg = this.customImages.has(product.id);

    return `
      <div class="product-card" data-product-id="${product.id}">
        <!-- Contenedor de Imagen con Fallback y Lazy Loading -->
        <div class="product-image-container">
          <img 
            src="${imgSrc}" 
            alt="${product.name}" 
            class="product-image" 
            loading="lazy"
            width="400"
            height="300"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            referrerpolicy="no-referrer"
          />

          <!-- Fallback visual si la imagen falla -->
          <div class="product-image-fallback" style="display: none;">
            <span style="font-size: 32px; margin-bottom: 6px;">🌿</span>
            <span style="font-size: 13px; font-weight: 700; color: var(--color-text-main);">${product.name}</span>
            <span style="font-size: 11px; color: var(--color-amber-primary); margin-top: 2px;">Aromass</span>
          </div>

          <!-- Badges de Estado -->
          <div style="position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 5px;">
            ${
              isPromo
                ? `<span style="background: var(--color-amber-primary); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">${product.promoLabel || 'PROMO'}</span>`
                : ''
            }
            ${
              product.status === 'demo_item'
                ? `<span style="background: rgba(41, 37, 36, 0.85); color: #E7E5E4; font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 4px;">Imagen ilustrativa</span>`
                : `<span style="background: rgba(22, 101, 52, 0.85); color: #FFFFFF; font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 4px;">Catálogo Aromass</span>`
            }
            ${
              hasCustomImg
                ? `<span style="background: #2563EB; color: #FFFFFF; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px;">Foto Local</span>`
                : ''
            }
          </div>

          <!-- Botón Lupa Ficha Rápida -->
          <button 
            class="quick-view-btn" 
            data-view-product-id="${product.id}"
            style="position: absolute; bottom: 8px; right: 8px; background: rgba(255, 255, 255, 0.94); border: 1px solid var(--color-border); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm);"
            title="Ver ficha técnica completa y cambiar foto"
          >
            🔍
          </button>
        </div>

        <!-- Cuerpo de Tarjeta -->
        <div style="padding: 14px; display: flex; flex-direction: column; flex: 1; justify-content: space-between; gap: 10px;">
          <div>
            <!-- Código y Familia Olfativa -->
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--color-text-muted); margin-bottom: 2px;">
              <span style="font-family: var(--font-mono); font-weight: 600;">${product.code}</span>
              <span aria-hidden="true">·</span>
              <span style="color: var(--color-amber-primary); font-weight: 600;">${product.olfactoryFamily}</span>
            </div>

            <!-- Título -->
            <h3 style="font-size: 15px; line-height: 1.25; color: var(--color-text-main); margin-bottom: 2px;">
              ${product.name}
            </h3>

            <!-- Volumen -->
            <div style="font-size: 11px; color: var(--color-text-light); margin-bottom: 4px;">
              ${product.volume} · ${product.presentation}
            </div>

            <!-- Descripción -->
            <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${product.description}
            </p>
          </div>

          <!-- Precios y Acciones -->
          <div style="border-top: 1px solid var(--color-border); padding-top: 10px;">
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
              <div>
                <span style="font-size: 17px; font-weight: 700; color: var(--color-text-main);" class="tabular-nums">
                  $${product.price.toLocaleString('es-AR')}
                </span>
                ${
                  product.discountPercent
                    ? `<span style="font-size: 11px; color: var(--color-text-light); text-decoration: line-through; margin-left: 4px;">$${Math.round(product.price * (1 + product.discountPercent / 100)).toLocaleString('es-AR')}</span>`
                    : ''
                }
              </div>

              <span style="font-size: 11px; font-weight: 700; color: var(--color-amber-primary); background: var(--color-amber-soft); padding: 1px 6px; border-radius: 4px;" class="tabular-nums">
                +${product.points} pts
              </span>
            </div>

            <!-- Selector de Cantidad y Agregar -->
            <div style="display: flex; gap: 6px;">
              <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-subtle); overflow: hidden;">
                <button class="qty-btn-minus" data-prod-id="${product.id}" style="width: 30px; height: 36px; border: none; background: none; font-size: 15px; font-weight: 600; cursor: pointer;">-</button>
                <input type="text" id="qty-input-${product.id}" value="1" readonly style="width: 28px; height: 36px; border: none; background: none; text-align: center; font-size: 12px; font-weight: 600; font-family: var(--font-sans);" />
                <button class="qty-btn-plus" data-prod-id="${product.id}" style="width: 30px; height: 36px; border: none; background: none; font-size: 15px; font-weight: 600; cursor: pointer;">+</button>
              </div>

              <button 
                class="btn btn-primary add-to-cart-btn" 
                data-add-id="${product.id}"
                style="flex: 1; min-height: 36px; padding: 6px 10px; font-size: 12px;"
              >
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSideDrawer(): string {
    const isDrawerOpen = this.isMenuDrawerOpen;
    const reseller = store.getReseller();

    return `
      <div id="sideDrawerBackdrop" class="side-drawer-backdrop ${isDrawerOpen ? 'open' : ''}">
        <div class="side-drawer">
          <!-- Drawer Header -->
          <div style="padding: 16px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-family: var(--font-serif); font-size: 18px; font-weight: 700;">AROMASS</div>
              <div style="font-size: 11px; color: var(--color-text-muted);">Menú de la Revista</div>
            </div>
            <button id="closeSideDrawerBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Drawer Links -->
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto;">
            
            <!-- Revendedor Info -->
            <div style="background: var(--color-surface-subtle); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); margin-bottom: 8px;">
              <div style="font-size: 11px; color: var(--color-text-muted); margin-bottom: 2px;">Revendedor Activo:</div>
              <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main);">${reseller.code} — ${reseller.name}</div>
              <button id="drawerChangeResellerBtn" class="btn btn-outline" style="width: 100%; min-height: 32px; font-size: 11px; margin-top: 8px;">
                Cambiar o Compartir Enlace
              </button>
            </div>

            <button id="drawerTourBtn" class="btn btn-outline" style="justify-content: flex-start; gap: 10px; font-size: 13px; text-align: left;">
              <span>👁️</span> Recorrido para Ángel (Guía)
            </button>

            <button id="drawerShowroomBtn" class="btn btn-outline" style="justify-content: flex-start; gap: 10px; font-size: 13px; text-align: left;">
              <span>✨</span> Showroom 3D & Bruma
            </button>

            <a href="#puntos" id="drawerPointsLink" class="btn btn-outline" style="justify-content: flex-start; gap: 10px; font-size: 13px; text-decoration: none;">
              <span>🏆</span> Programa de Puntos
            </a>

            <button id="drawerAdminBtn" class="btn btn-outline" style="justify-content: flex-start; gap: 10px; font-size: 13px; text-align: left;">
              <span>⚙️</span> Panel de Demostración
            </button>

            ${
              this.deferredInstallPrompt && !this.isAppInstalled
                ? `
                <button id="drawerPWAInstallBtn" class="btn btn-amber" style="justify-content: flex-start; gap: 10px; font-size: 13px; margin-top: 12px;">
                  <span>📲</span> Instalar AROMASS en Celular
                </button>
              `
                : ''
            }
          </div>

          <div style="padding: 16px; border-top: 1px solid var(--color-border); font-size: 11px; color: var(--color-text-muted); text-align: center;">
            AROMASS Catálogo Digital v1.1<br/>Optimizado para Android y Chrome
          </div>
        </div>
      </div>
    `;
  }

  private renderProductDetailModal(): string {
    const p = this.selectedProductForModal;
    if (!p) return '';

    const imgSrc = this.getProductImageSrc(p);
    const hasCustomImg = this.customImages.has(p.id);

    return `
      <div id="productDetailModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 640px;">
          <div class="drag-handle"></div>

          <!-- Header Modal -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--color-border);">
            <div style="font-size: 12px; color: var(--color-amber-primary); font-weight: 600;">
              ${p.code} · ${p.category.toUpperCase()}
            </div>
            <button id="closeDetailModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Cuerpo -->
          <div style="overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr; @media(min-width: 500px){ grid-template-columns: 1fr 1fr; } gap: 14px;">
              <div style="border-radius: var(--radius-md); overflow: hidden; background: var(--color-sand); aspect-ratio: 4/3; position: relative;">
                <img src="${imgSrc}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
                
                <button 
                  id="openUploadModalFromDetailBtn" 
                  style="position: absolute; bottom: 8px; left: 8px; background: rgba(28, 25, 23, 0.85); color: #FFFFFF; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;"
                  title="Subir foto real de este producto desde la cámara o galería"
                >
                  📷 ${hasCustomImg ? 'Cambiar Foto' : 'Subir Foto'}
                </button>
              </div>

              <div style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h2 style="font-size: 18px; color: var(--color-text-main); margin-bottom: 4px;">
                    ${p.name}
                  </h2>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px;">
                    Familia: <strong>${p.olfactoryFamily}</strong><br/>
                    Presentación: ${p.volume} (${p.presentation})
                  </div>
                  <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4;">
                    ${p.description}
                  </p>
                </div>

                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-border);">
                  <div style="display: flex; align-items: baseline; justify-content: space-between;">
                    <span style="font-size: 20px; font-weight: 700;" class="tabular-nums">$${p.price.toLocaleString('es-AR')}</span>
                    <span style="font-size: 12px; font-weight: 700; color: var(--color-amber-primary);">+${p.points} puntos</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pirámide Olfativa -->
            <div style="background: var(--color-surface-subtle); border-radius: var(--radius-sm); padding: 12px; border: 1px solid var(--color-border);">
              <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Pirámide Olfativa</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px;">
                <div style="background: #FFFFFF; padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent);">Salida</div>
                  <div style="color: var(--color-text-muted);">${p.notes.top}</div>
                </div>
                <div style="background: #FFFFFF; padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent);">Corazón</div>
                  <div style="color: var(--color-text-muted);">${p.notes.heart}</div>
                </div>
                <div style="background: #FFFFFF; padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent);">Fondo</div>
                  <div style="color: var(--color-text-muted);">${p.notes.base}</div>
                </div>
              </div>
            </div>

            <button id="inspect3DFromModalBtn" class="btn btn-outline" style="width: 100%; border-color: var(--color-amber-accent); color: var(--color-amber-primary); font-size: 13px;">
              ✨ Abrir en Showroom 3D Interactivo
            </button>
          </div>

          <!-- Footer Agregar -->
          <div style="padding: 14px 18px; border-top: 1px solid var(--color-border); background: #FFFFFF; display: flex; gap: 8px;">
            <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-subtle);">
              <button id="modalQtyMinus" style="width: 36px; height: 42px; border: none; background: none; font-size: 16px; font-weight: 600; cursor: pointer;">-</button>
              <input type="text" id="modalQtyInput" value="1" readonly style="width: 36px; height: 42px; border: none; background: none; text-align: center; font-size: 13px; font-weight: 600;" />
              <button id="modalQtyPlus" style="width: 36px; height: 42px; border: none; background: none; font-size: 16px; font-weight: 600; cursor: pointer;">+</button>
            </div>

            <button id="modalAddToCartBtn" class="btn btn-primary" style="flex: 1; height: 42px; font-size: 13px;">
              Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderImageUploadModal(): string {
    if (!this.isImageUploadModalOpen || !this.uploadTargetProduct) return '';
    const p = this.uploadTargetProduct;
    const hasCustom = this.customImages.has(p.id);

    return `
      <div id="imageUploadModal" class="modal-backdrop open" style="z-index: 120;">
        <div class="modal-sheet" style="max-width: 500px;">
          <div class="drag-handle"></div>

          <div style="padding: 14px 18px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 style="font-size: 16px; font-weight: 700;">Foto de Producto: ${p.name}</h3>
              <div style="font-size: 11px; color: var(--color-text-muted);">Carga local desde la cámara o galería</div>
            </div>
            <button id="closeUploadModalBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-text-muted);">✕</button>
          </div>

          <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
            
            <!-- Aviso transparente requerido -->
            <div style="background: #FEF3C7; border-left: 3px solid #D97706; padding: 10px 12px; border-radius: 4px; font-size: 12px; color: #92400E; line-height: 1.35;">
              <strong>Guardado solo en este dispositivo (modo demostración):</strong> La imagen se almacena en el navegador de tu celular (IndexedDB). No se sube a servidores externos.
            </div>

            <!-- Vista previa de la foto seleccionada -->
            <div style="border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 16px; text-align: center; background: var(--color-surface-subtle); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px;">
              <img id="uploadPreviewImg" src="${this.getProductImageSrc(p)}" alt="Vista previa" style="max-width: 100%; max-height: 160px; object-fit: contain; border-radius: var(--radius-sm); margin-bottom: 8px;" />
              <div id="uploadFileInfoLabel" style="font-size: 11px; color: var(--color-text-muted);">
                ${hasCustom ? 'Foto personalizada actual almacenada' : 'Foto ilustrativa original de catálogo'}
              </div>
            </div>

            <!-- Selector de archivo -->
            <div>
              <input type="file" id="phonePhotoFileInput" accept="image/jpeg,image/png,image/webp" style="display: none;" />
              <button id="selectPhotoFileBtn" class="btn btn-outline" style="width: 100%; font-size: 13px; gap: 8px;">
                📁 Seleccionar Foto o Tomar con Cámara (JPG, PNG, WebP)
              </button>
              <div style="font-size: 11px; color: var(--color-text-light); text-align: center; margin-top: 4px;">
                Tamaño máximo permitido: 5 MB (se comprime automáticamente).
              </div>
            </div>

            <div id="uploadErrorMsg" style="display: none; background: #FEE2E2; color: #B91C1C; padding: 8px 12px; border-radius: 4px; font-size: 12px;"></div>

            <!-- Botones Guardar / Restaurar -->
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              ${
                hasCustom
                  ? `<button id="deleteCustomPhotoBtn" class="btn btn-outline" style="color: #DC2626; border-color: #FECACA; font-size: 12px; flex: 1;">Restaurar Original</button>`
                  : ''
              }
              <button id="confirmSavePhotoBtn" class="btn btn-primary" style="flex: 2; font-size: 12px;" disabled>
                Guardar Foto en Dispositivo
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCartModal(): string {
    if (!this.isCartOpen) return '';

    const cart = store.getCart();
    const subtotal = store.getSubtotal();
    const totalPoints = store.getTotalPoints();
    const reseller = store.getReseller();

    return `
      <div id="cartModal" class="modal-backdrop open">
        <div class="modal-sheet">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 17px; color: var(--color-text-main);">Tu Pedido de Catálogo</h2>
              <span style="font-size: 11px; color: var(--color-text-muted);">Revendedor: ${reseller.code} (${reseller.name.split(':')[1] || reseller.name})</span>
            </div>
            <button id="closeCartModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="overflow-y: auto; padding: 16px 18px; flex: 1; display: flex; flex-direction: column; gap: 12px;">
            ${
              cart.length === 0
                ? `
                <div style="text-align: center; padding: 40px 16px; color: var(--color-text-muted);">
                  <div style="font-size: 30px; margin-bottom: 8px;">🛍️</div>
                  <h3 style="font-size: 15px; margin-bottom: 4px; color: var(--color-text-main);">Tu carrito está vacío</h3>
                  <p style="font-size: 12px; margin-bottom: 14px;">Explorá las fragancias del catálogo y agregalas para armar tu pedido.</p>
                  <button id="continueShoppingEmptyBtn" class="btn btn-outline" style="font-size: 12px;">Ir al Catálogo</button>
                </div>
              `
                : `
                <!-- Barra de Puntos en Carrito -->
                <div style="background: var(--color-surface-subtle); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                  <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                    <span>Puntos en este pedido:</span>
                    <span style="color: var(--color-amber-primary);">${totalPoints} pts</span>
                  </div>
                  <div class="points-bar-bg">
                    <div class="points-bar-fill" style="width: ${Math.min(100, (totalPoints / 85) * 100)}%;"></div>
                  </div>
                  <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
                    ${
                      totalPoints < 35
                        ? `A ${35 - totalPoints} pts de bonificar el envío con tu revendedor.`
                        : totalPoints < 60
                          ? `¡Nivel 1 alcanzado! A ${60 - totalPoints} pts de mini difusor bonificado.`
                          : totalPoints < 85
                            ? `¡Nivel 2 alcanzado! A ${85 - totalPoints} pts de esencia concentrada.`
                            : `¡Alcanzaste el nivel máximo de beneficios de campaña!`
                    }
                  </div>
                </div>

                ${cart
                  .map(
                    (item) => `
                  <div style="display: flex; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--color-border); align-items: center;">
                    <img src="${this.getProductImageSrc(item.product)}" alt="${item.product.name}" style="width: 52px; height: 52px; border-radius: 4px; object-fit: cover; background: var(--color-sand);" referrerpolicy="no-referrer" />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 13px; font-weight: 600; color: var(--color-text-main); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${item.product.name}</div>
                      <div style="font-size: 11px; color: var(--color-text-muted);">$${item.product.price.toLocaleString('es-AR')} · ${item.product.points * item.quantity} pts</div>
                    </div>

                    <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: 4px;">
                      <button class="cart-item-minus" data-id="${item.product.id}" style="width: 26px; height: 28px; border: none; background: none; cursor: pointer; font-weight: 600;">-</button>
                      <span style="width: 22px; text-align: center; font-size: 11px; font-weight: 700;">${item.quantity}</span>
                      <button class="cart-item-plus" data-id="${item.product.id}" style="width: 26px; height: 28px; border: none; background: none; cursor: pointer; font-weight: 600;">+</button>
                    </div>

                    <button class="cart-item-remove" data-id="${item.product.id}" style="border: none; background: none; color: #DC2626; cursor: pointer; padding: 4px;" title="Eliminar producto">
                      🗑️
                    </button>
                  </div>
                `
                  )
                  .join('')}

                <div style="display: flex; justify-content: flex-end;">
                  <button id="clearCartBtn" style="background: none; border: none; font-size: 11px; color: var(--color-text-light); cursor: pointer; text-decoration: underline;">
                    Vaciar Carrito
                  </button>
                </div>
              `
            }
          </div>

          ${
            cart.length > 0
              ? `
            <div style="padding: 14px 18px; border-top: 1px solid var(--color-border); background: #FFFFFF; display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 13px; color: var(--color-text-muted);">Total Estimado:</span>
                <span style="font-size: 22px; font-weight: 700; color: var(--color-text-main);" class="tabular-nums">
                  $${subtotal.toLocaleString('es-AR')}
                </span>
              </div>

              <div style="display: flex; gap: 8px;">
                <button id="continueShoppingBtn" class="btn btn-outline" style="flex: 1; font-size: 12px;">
                  Seguir
                </button>
                <button id="proceedToCheckoutBtn" class="btn btn-whatsapp" style="flex: 1.5; font-size: 13px;">
                  Completar Pedido →
                </button>
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  private renderCheckoutModal(): string {
    if (!this.isCheckoutOpen) return '';

    const cart = store.getCart();
    const subtotal = store.getSubtotal();
    const totalPoints = store.getTotalPoints();
    const reseller = store.getReseller();
    const waConfig = store.getWhatsappConfig();

    return `
      <div id="checkoutModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 580px;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 17px; color: var(--color-text-main);">Finalizar Pedido por WhatsApp</h2>
              <span style="font-size: 11px; color: var(--color-text-muted);">Revendedor: <strong>${reseller.code}</strong> (${reseller.name.split(':')[1] || reseller.name})</span>
            </div>
            <button id="closeCheckoutModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="overflow-y: auto; padding: 18px; flex: 1; display: flex; flex-direction: column; gap: 14px;">
            <div style="background: var(--color-surface-subtle); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 12px;">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 2px;">
                <span>${cart.reduce((s, i) => s + i.quantity, 0)} productos en pedido:</span>
                <span class="tabular-nums">$${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div style="color: var(--color-amber-primary); font-size: 11px; font-weight: 600;">
                +${totalPoints} puntos en Campaña ${CURRENT_CAMPAIGN.number}
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px;">Nombre y Apellido *</label>
              <input type="text" id="customerName" placeholder="Ej: Valentina Morales" style="width: 100%; height: 40px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 13px;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px;">Tu WhatsApp *</label>
                <input type="tel" id="customerPhone" placeholder="Ej: 11 4455-6677" style="width: 100%; height: 40px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 13px;" />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px;">Localidad *</label>
                <input type="text" id="customerCity" placeholder="Ej: Córdoba Capital" style="width: 100%; height: 40px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 13px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px;">Dirección de Entrega (Opcional)</label>
              <input type="text" id="customerAddress" placeholder="Calle, número o barrio" style="width: 100%; height: 40px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 13px;" />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px;">Observaciones</label>
              <textarea id="customerNotes" rows="2" placeholder="Ej: Entregar preferentemente por la tarde" style="width: 100%; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 12px; resize: none;"></textarea>
            </div>

            <div style="background: #FEF3C7; border-left: 3px solid #D97706; padding: 8px 12px; border-radius: 4px; font-size: 11px; color: #92400E; line-height: 1.35;">
              <strong>Demostración de Enlace WhatsApp:</strong> Se abrirá WhatsApp con el pedido estructurado. Destinatario actual: <code>${waConfig.recipientPhone}</code>.
            </div>
          </div>

          <div style="padding: 14px 18px; border-top: 1px solid var(--color-border); background: #FFFFFF;">
            <button id="sendWhatsAppOrderBtn" class="btn btn-whatsapp" style="width: 100%; height: 46px; font-size: 14px;">
              <span>📲 ENVIAR PEDIDO POR WHATSAPP</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private render3DShowroomModal(): string {
    if (!this.is3DModalOpen) return '';

    return `
      <div id="showroom3DModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 620px;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 17px; color: var(--color-text-main);">Showroom 3D Aromass</h2>
              <span style="font-size: 11px; color: var(--color-text-muted);">Girá la botella para apreciar el vidrio ámbar y la etiqueta</span>
            </div>
            <button id="close3DModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Canvas 3D -->
          <div id="threeCanvasContainer" style="width: 100%; height: 330px; background: radial-gradient(circle at center, #F5EFEB 0%, #E8E1DA 100%); position: relative; cursor: grab;">
            <div style="position: absolute; top: 10px; left: 12px; background: rgba(255,255,255,0.88); padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; pointer-events: none;">
              Arrastrá con el dedo para rotar 360°
            </div>
          </div>

          <div style="padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; background: #FFFFFF;">
            <div style="display: flex; gap: 8px;">
              <button id="sprayMistBtn" class="btn btn-amber" style="flex: 1; font-size: 12px;">
                💨 Vaporizar Bruma
              </button>
              <button id="toggleBottleDiffuserBtn" class="btn btn-outline" style="flex: 1; font-size: 12px;">
                Modo Difusor
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAdminModal(): string {
    if (!this.isAdminOpen) return '';

    const orders = store.getOrders();
    const resellers = store.getAllResellers();
    const waConfig = store.getWhatsappConfig();

    return `
      <div id="adminModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 680px; max-height: 88vh;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 17px; color: var(--color-text-main);">Panel de Demostración & Control</h2>
              <span style="font-size: 11px; color: var(--color-text-muted);">Auditoría de Pedidos, Revendedores y Campañas</span>
            </div>
            <button id="closeAdminModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #EFF6FF; border-left: 3px solid #3B82F6; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1E40AF; line-height: 1.35;">
              <strong>Prototipo Demostrativo:</strong> Datos almacenados localmente en este dispositivo. No simula una base de datos real.
            </div>

            <!-- WhatsApp de destino -->
            <div style="background: var(--color-surface-subtle); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
              <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">WhatsApp Comercial de Recepción</h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <input type="text" id="adminWaPhone" value="${waConfig.recipientPhone}" placeholder="Número de WhatsApp con código de país" style="flex: 1; height: 36px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 12px;" />
                <button id="saveAdminWaBtn" class="btn btn-primary" style="min-height: 36px; padding: 4px 12px; font-size: 12px;">Guardar</button>
              </div>
            </div>

            <!-- Pedidos Recibidos -->
            <div>
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">Pedidos Generados en Demostración (${orders.length})</h4>
              ${
                orders.length === 0
                  ? `<p style="font-size: 12px; color: var(--color-text-muted);">Aún no se han enviado pedidos.</p>`
                  : `
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${orders
                      .map(
                        (ord) => `
                      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 2px;">
                          <span>${ord.id} · ${ord.customer.fullName}</span>
                          <span class="tabular-nums" style="color: var(--color-amber-primary); font-size: 14px;">$${ord.totalAmount.toLocaleString('es-AR')}</span>
                        </div>
                        <div style="color: var(--color-text-muted); font-size: 11px; margin-bottom: 4px;">
                          ${ord.date} · Revendedor: <strong>${ord.resellerCode}</strong> · ${ord.customer.city}
                        </div>
                        <div style="font-size: 11px; color: var(--color-text-main); background: var(--color-surface-subtle); padding: 4px 8px; border-radius: 4px;">
                          ${ord.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                `
              }
            </div>

            <!-- Revendedores -->
            <div>
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">Revendedores Habilitados</h4>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${resellers
                  .map(
                    (r) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid var(--color-border); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px;">
                    <div>
                      <strong>${r.code}</strong> — ${r.name}
                      <div style="font-size: 10px; color: var(--color-text-muted);">${r.zone}</div>
                    </div>
                    <button class="select-reseller-btn btn btn-outline" data-reseller-code="${r.code}" style="min-height: 28px; padding: 2px 8px; font-size: 11px;">
                      Activar
                    </button>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  private renderResellerModal(): string {
    if (!this.isResellerModalOpen) return '';

    const current = store.getReseller();
    const resellers = store.getAllResellers();
    const currentUrl = window.location.origin + window.location.pathname + `?revendedor=${current.code}`;

    return `
      <div id="resellerModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 500px;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--color-border);">
            <h2 style="font-size: 17px; color: var(--color-text-main);">Gestión de Enlace de Revendedor</h2>
            <button id="closeResellerModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
            <p style="font-size: 12px; color: var(--color-text-muted); line-height: 1.4;">
              Cada revendedor puede compartir su enlace personalizado. El código se conserva automáticamente durante todo el proceso de pedido.
            </p>

            <div style="background: var(--color-surface-subtle); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
              <label style="display: block; font-size: 11px; font-weight: 700; margin-bottom: 4px;">
                Enlace Personalizado (${current.code}):
              </label>
              <div style="display: flex; gap: 6px;">
                <input type="text" id="resellerShareUrl" readonly value="${currentUrl}" style="flex: 1; height: 36px; padding: 0 8px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 11px; font-family: var(--font-mono); background: #FFF;" />
                <button id="copyResellerLinkBtn" class="btn btn-primary" style="min-height: 36px; padding: 4px 10px; font-size: 11px;">
                  Copiar
                </button>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                Alternar a otro revendedor de prueba:
              </label>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${resellers
                  .map(
                    (r) => `
                  <button class="select-reseller-btn btn ${r.code === current.code ? 'btn-amber' : 'btn-outline'}" data-reseller-code="${r.code}" style="justify-content: space-between; text-align: left; width: 100%; font-size: 12px; padding: 8px 12px;">
                    <span><strong>${r.code}</strong> — ${r.name.split(':')[1] || r.name}</span>
                    <span style="font-size: 10px;">${r.zone}</span>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  private getCategoryTitle(): string {
    const found = CATEGORIES.find((c) => c.id === this.selectedCategory);
    return found ? found.label : 'Catálogo de Productos';
  }

  private attachEventListeners() {
    // 1. Selector de Categorías
    this.container.querySelectorAll('.category-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-category-id') || 'todas';
        this.selectedCategory = cat;
        this.render();
      });
    });

    // 2. Buscador Optimizado (Solo actualiza el contenedor de productos para NO perder foco ni re-renderizar todo el DOM)
    const searchInput = this.container.querySelector('#catalogSearchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        const filtered = this.getFilteredProducts();
        
        const grid = this.container.querySelector('#productsGridContainer');
        if (grid) {
          grid.innerHTML = this.renderProductsListHTML(filtered);
          this.attachProductListListeners();
        }
        const countLabel = this.container.querySelector('#productsCountLabel');
        if (countLabel) {
          countLabel.textContent = `${filtered.length} productos`;
        }
      });
    }

    const clearSearchBtn = this.container.querySelector('#clearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // 3. Filtro Promociones
    const promoCheck = this.container.querySelector('#promoOnlyCheckbox') as HTMLInputElement;
    if (promoCheck) {
      promoCheck.addEventListener('change', (e) => {
        this.onlyPromos = (e.target as HTMLInputElement).checked;
        this.render();
      });
    }

    // 4. Selector de Orden
    const sortSelect = this.container.querySelector('#sortBySelect') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = (e.target as HTMLSelectElement).value;
        this.render();
      });
    }

    // 5. Drawer lateral
    const openMenuDrawerBtn = this.container.querySelector('#openMenuDrawerBtn');
    const closeSideDrawerBtn = this.container.querySelector('#closeSideDrawerBtn');
    const bottomNavMenuBtn = this.container.querySelector('#bottomNavMenuBtn');

    if (openMenuDrawerBtn) openMenuDrawerBtn.addEventListener('click', () => { this.isMenuDrawerOpen = true; this.render(); });
    if (bottomNavMenuBtn) bottomNavMenuBtn.addEventListener('click', () => { this.isMenuDrawerOpen = true; this.render(); });
    if (closeSideDrawerBtn) closeSideDrawerBtn.addEventListener('click', () => { this.isMenuDrawerOpen = false; this.render(); });

    // Drawer links
    const drawerTourBtn = this.container.querySelector('#drawerTourBtn');
    if (drawerTourBtn) {
      drawerTourBtn.addEventListener('click', () => {
        this.isMenuDrawerOpen = false;
        this.isTourVisible = true;
        this.render();
      });
    }

    const drawerShowroomBtn = this.container.querySelector('#drawerShowroomBtn');
    if (drawerShowroomBtn) {
      drawerShowroomBtn.addEventListener('click', () => {
        this.isMenuDrawerOpen = false;
        this.open3DShowroom();
      });
    }

    const drawerAdminBtn = this.container.querySelector('#drawerAdminBtn');
    if (drawerAdminBtn) {
      drawerAdminBtn.addEventListener('click', () => {
        this.isMenuDrawerOpen = false;
        this.isAdminOpen = true;
        this.render();
      });
    }

    const drawerChangeResellerBtn = this.container.querySelector('#drawerChangeResellerBtn');
    if (drawerChangeResellerBtn) {
      drawerChangeResellerBtn.addEventListener('click', () => {
        this.isMenuDrawerOpen = false;
        this.isResellerModalOpen = true;
        this.render();
      });
    }

    // PWA Install handlers
    const pwaInstallHeaderBtn = this.container.querySelector('#pwaInstallHeaderBtn');
    const drawerPWAInstallBtn = this.container.querySelector('#drawerPWAInstallBtn');
    const triggerPWAInstall = async () => {
      if (this.deferredInstallPrompt) {
        await this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.isAppInstalled = true;
          this.deferredInstallPrompt = null;
          this.showToast('¡App AROMASS instalada con éxito!');
        }
        this.render();
      } else if (this.isIOS) {
        alert('Para instalar en iPhone/iPad:\n1. Tocá el botón Compartir en Safari.\n2. Seleccioná "Agregar a pantalla de inicio".');
      }
    };
    if (pwaInstallHeaderBtn) pwaInstallHeaderBtn.addEventListener('click', triggerPWAInstall);
    if (drawerPWAInstallBtn) drawerPWAInstallBtn.addEventListener('click', triggerPWAInstall);

    // 6. Listeners de la lista de productos
    this.attachProductListListeners();

    // 7. Modales de Ficha y Carrito
    this.attachModalListeners();

    // 8. Tour de Ángel
    const toggleTourCompactBtn = this.container.querySelector('#toggleTourCompactBtn');
    const expandTourBtn = this.container.querySelector('#expandTourBtn');
    const collapseTourBtn = this.container.querySelector('#collapseTourBtn');
    const tourPrevBtn = this.container.querySelector('#tourPrevBtn');
    const tourNextBtn = this.container.querySelector('#tourNextBtn');

    if (toggleTourCompactBtn) {
      toggleTourCompactBtn.addEventListener('click', () => {
        this.isTourVisible = !this.isTourVisible;
        this.render();
      });
    }
    if (expandTourBtn) {
      expandTourBtn.addEventListener('click', () => {
        this.isTourVisible = true;
        this.render();
      });
    }
    if (collapseTourBtn) {
      collapseTourBtn.addEventListener('click', () => {
        this.isTourVisible = false;
        this.render();
      });
    }

    if (tourPrevBtn) {
      tourPrevBtn.addEventListener('click', () => {
        if (this.activeTourStep > 0) {
          this.activeTourStep--;
          this.render();
        }
      });
    }

    if (tourNextBtn) {
      tourNextBtn.addEventListener('click', () => {
        if (this.activeTourStep < 9) {
          this.activeTourStep++;
          if (this.activeTourStep === 4) {
            this.selectedProductForModal = PRODUCTS[0];
          } else if (this.activeTourStep === 5) {
            this.selectedProductForModal = null;
            this.open3DShowroom();
          } else if (this.activeTourStep === 6) {
            this.close3DShowroom();
            this.isCartOpen = true;
          } else if (this.activeTourStep === 8) {
            this.isCartOpen = false;
            this.isCheckoutOpen = true;
          } else if (this.activeTourStep === 9) {
            this.isCheckoutOpen = false;
            this.isAdminOpen = true;
          }
          this.render();
        } else {
          this.activeTourStep = 0;
          this.render();
        }
      });
    }

    // 9. Carga de fotos desde celular (IndexedDB)
    this.attachImageUploadListeners();
  }

  private attachProductListListeners() {
    this.container.querySelectorAll('.qty-btn-plus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-prod-id');
        if (!id) return;
        const input = this.container.querySelector(`#qty-input-${id}`) as HTMLInputElement;
        if (input) {
          const val = parseInt(input.value, 10) || 1;
          input.value = String(val + 1);
        }
      });
    });

    this.container.querySelectorAll('.qty-btn-minus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-prod-id');
        if (!id) return;
        const input = this.container.querySelector(`#qty-input-${id}`) as HTMLInputElement;
        if (input) {
          const val = parseInt(input.value, 10) || 1;
          if (val > 1) input.value = String(val - 1);
        }
      });
    });

    this.container.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-add-id');
        if (!id) return;
        const product = PRODUCTS.find((p) => p.id === id);
        const input = this.container.querySelector(`#qty-input-${id}`) as HTMLInputElement;
        const qty = input ? parseInt(input.value, 10) || 1 : 1;
        if (product) {
          store.addToCart(product, qty);
          const original = (e.currentTarget as HTMLElement).innerHTML;
          (e.currentTarget as HTMLElement).innerHTML = '✓ Agregado';
          this.showToast(`Agregaste ${qty}x ${product.name} al carrito`);
          setTimeout(() => {
            (e.currentTarget as HTMLElement).innerHTML = original;
          }, 1200);
        }
      });
    });

    this.container.querySelectorAll('.quick-view-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-view-product-id');
        if (!id) return;
        const product = PRODUCTS.find((p) => p.id === id);
        if (product) {
          this.selectedProductForModal = product;
          this.render();
        }
      });
    });

    const resetFiltersBtn = this.container.querySelector('#resetFiltersBtn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.selectedCategory = 'todas';
        this.searchQuery = '';
        this.onlyPromos = false;
        this.render();
      });
    }
  }

  private attachModalListeners() {
    // Cerrar Ficha
    const closeDetailModalBtn = this.container.querySelector('#closeDetailModalBtn');
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener('click', () => {
        this.selectedProductForModal = null;
        this.render();
      });
    }

    const modalQtyPlus = this.container.querySelector('#modalQtyPlus');
    const modalQtyMinus = this.container.querySelector('#modalQtyMinus');
    const modalQtyInput = this.container.querySelector('#modalQtyInput') as HTMLInputElement;
    if (modalQtyPlus && modalQtyInput) {
      modalQtyPlus.addEventListener('click', () => {
        const val = parseInt(modalQtyInput.value, 10) || 1;
        modalQtyInput.value = String(val + 1);
      });
    }
    if (modalQtyMinus && modalQtyInput) {
      modalQtyMinus.addEventListener('click', () => {
        const val = parseInt(modalQtyInput.value, 10) || 1;
        if (val > 1) modalQtyInput.value = String(val - 1);
      });
    }

    const modalAddToCartBtn = this.container.querySelector('#modalAddToCartBtn');
    if (modalAddToCartBtn && this.selectedProductForModal) {
      modalAddToCartBtn.addEventListener('click', () => {
        const qty = modalQtyInput ? parseInt(modalQtyInput.value, 10) || 1 : 1;
        store.addToCart(this.selectedProductForModal!, qty);
        this.showToast(`Agregaste ${qty}x ${this.selectedProductForModal!.name}`);
        this.selectedProductForModal = null;
        this.isCartOpen = true;
        this.render();
      });
    }

    const inspect3DFromModalBtn = this.container.querySelector('#inspect3DFromModalBtn');
    if (inspect3DFromModalBtn) {
      inspect3DFromModalBtn.addEventListener('click', () => {
        this.selectedProductForModal = null;
        this.open3DShowroom();
      });
    }

    // Carrito
    const openCartTopBtn = this.container.querySelector('#openCartTopBtn');
    const bottomNavCartBtn = this.container.querySelector('#bottomNavCartBtn');
    const closeCartModalBtn = this.container.querySelector('#closeCartModalBtn');
    const continueShoppingBtn = this.container.querySelector('#continueShoppingBtn');
    const continueShoppingEmptyBtn = this.container.querySelector('#continueShoppingEmptyBtn');

    if (openCartTopBtn) openCartTopBtn.addEventListener('click', () => { this.isCartOpen = true; this.render(); });
    if (bottomNavCartBtn) bottomNavCartBtn.addEventListener('click', () => { this.isCartOpen = true; this.render(); });
    if (closeCartModalBtn) closeCartModalBtn.addEventListener('click', () => { this.isCartOpen = false; this.render(); });
    if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', () => { this.isCartOpen = false; this.render(); });
    if (continueShoppingEmptyBtn) continueShoppingEmptyBtn.addEventListener('click', () => { this.isCartOpen = false; this.render(); });

    this.container.querySelectorAll('.cart-item-plus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        const item = store.getCart().find((i) => i.product.id === id);
        if (item) store.updateQuantity(id, item.quantity + 1);
      });
    });

    this.container.querySelectorAll('.cart-item-minus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        const item = store.getCart().find((i) => i.product.id === id);
        if (item) store.updateQuantity(id, item.quantity - 1);
      });
    });

    this.container.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) store.removeFromCart(id);
      });
    });

    const clearCartBtn = this.container.querySelector('#clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => {
        store.clearCart();
      });
    }

    // Checkout
    const proceedToCheckoutBtn = this.container.querySelector('#proceedToCheckoutBtn');
    const closeCheckoutModalBtn = this.container.querySelector('#closeCheckoutModalBtn');
    const sendWhatsAppOrderBtn = this.container.querySelector('#sendWhatsAppOrderBtn');

    if (proceedToCheckoutBtn) {
      proceedToCheckoutBtn.addEventListener('click', () => {
        this.isCartOpen = false;
        this.isCheckoutOpen = true;
        this.render();
      });
    }
    if (closeCheckoutModalBtn) {
      closeCheckoutModalBtn.addEventListener('click', () => {
        this.isCheckoutOpen = false;
        this.render();
      });
    }

    if (sendWhatsAppOrderBtn) {
      sendWhatsAppOrderBtn.addEventListener('click', () => {
        const nameInput = this.container.querySelector('#customerName') as HTMLInputElement;
        const phoneInput = this.container.querySelector('#customerPhone') as HTMLInputElement;
        const cityInput = this.container.querySelector('#customerCity') as HTMLInputElement;
        const addressInput = this.container.querySelector('#customerAddress') as HTMLInputElement;
        const notesInput = this.container.querySelector('#customerNotes') as HTMLTextAreaElement;

        const fullName = nameInput?.value.trim() || '';
        const whatsapp = phoneInput?.value.trim() || '';
        const city = cityInput?.value.trim() || '';
        const address = addressInput?.value.trim() || '';
        const notes = notesInput?.value.trim() || '';

        if (!fullName || !whatsapp || !city) {
          alert('Por favor completá los campos requeridos: Nombre, WhatsApp y Localidad.');
          return;
        }

        const customer: OrderCustomer = { fullName, whatsapp, city, address, notes };
        const { waUrl } = store.generateWhatsAppMessage(customer);
        store.recordOrder(customer);

        window.open(waUrl, '_blank');
        this.isCheckoutOpen = false;
        store.clearCart();
        this.showToast('¡Pedido generado! Se abrió WhatsApp para enviarlo al revendedor.');
        this.render();
      });
    }

    // Showroom 3D
    const openShowroomCoverBtn = this.container.querySelector('#openShowroomCoverBtn');
    const bottomNav3DBtn = this.container.querySelector('#bottomNav3DBtn');
    const close3DModalBtn = this.container.querySelector('#close3DModalBtn');

    if (openShowroomCoverBtn) openShowroomCoverBtn.addEventListener('click', () => this.open3DShowroom());
    if (bottomNav3DBtn) bottomNav3DBtn.addEventListener('click', () => this.open3DShowroom());
    if (close3DModalBtn) close3DModalBtn.addEventListener('click', () => this.close3DShowroom());

    const sprayMistBtn = this.container.querySelector('#sprayMistBtn');
    if (sprayMistBtn && this.showroomInstance) {
      sprayMistBtn.addEventListener('click', () => {
        this.showroomInstance?.triggerSpray();
      });
    }

    const toggleBottleDiffuserBtn = this.container.querySelector('#toggleBottleDiffuserBtn');
    if (toggleBottleDiffuserBtn && this.showroomInstance) {
      let isDiffuser = false;
      toggleBottleDiffuserBtn.addEventListener('click', () => {
        isDiffuser = !isDiffuser;
        this.showroomInstance?.setBottleType(isDiffuser ? 'diffuser' : 'spray');
        toggleBottleDiffuserBtn.textContent = isDiffuser ? 'Modo Spray' : 'Modo Difusor';
      });
    }

    // Admin & Revendedores
    const footerAdminBtn = this.container.querySelector('#footerAdminBtn');
    const closeAdminModalBtn = this.container.querySelector('#closeAdminModalBtn');
    const openResellerModalBtn = this.container.querySelector('#openResellerModalBtn');
    const closeResellerModalBtn = this.container.querySelector('#closeResellerModalBtn');

    if (footerAdminBtn) footerAdminBtn.addEventListener('click', () => { this.isAdminOpen = true; this.render(); });
    if (closeAdminModalBtn) closeAdminModalBtn.addEventListener('click', () => { this.isAdminOpen = false; this.render(); });
    if (openResellerModalBtn) openResellerModalBtn.addEventListener('click', () => { this.isResellerModalOpen = true; this.render(); });
    if (closeResellerModalBtn) closeResellerModalBtn.addEventListener('click', () => { this.isResellerModalOpen = false; this.render(); });

    this.container.querySelectorAll('.select-reseller-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).getAttribute('data-reseller-code');
        if (code) {
          store.setReseller(code);
          this.isResellerModalOpen = false;
          this.isAdminOpen = false;
          this.showToast(`Revendedor activo actualizado a ${code}`);
          this.render();
        }
      });
    });

    const copyResellerLinkBtn = this.container.querySelector('#copyResellerLinkBtn');
    if (copyResellerLinkBtn) {
      copyResellerLinkBtn.addEventListener('click', () => {
        const urlInput = this.container.querySelector('#resellerShareUrl') as HTMLInputElement;
        if (urlInput) {
          urlInput.select();
          navigator.clipboard.writeText(urlInput.value);
          this.showToast('Enlace de revendedor copiado');
          copyResellerLinkBtn.textContent = '¡Copiado!';
          setTimeout(() => { copyResellerLinkBtn.textContent = 'Copiar'; }, 1500);
        }
      });
    }

    const saveAdminWaBtn = this.container.querySelector('#saveAdminWaBtn');
    if (saveAdminWaBtn) {
      saveAdminWaBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#adminWaPhone') as HTMLInputElement;
        if (input && input.value.trim()) {
          store.setWhatsappConfig(input.value.trim(), 'Comercial Aromass');
          this.showToast('Número de WhatsApp comercial guardado.');
          this.render();
        }
      });
    }
  }

  private attachImageUploadListeners() {
    const openUploadModalFromDetailBtn = this.container.querySelector('#openUploadModalFromDetailBtn');
    if (openUploadModalFromDetailBtn && this.selectedProductForModal) {
      openUploadModalFromDetailBtn.addEventListener('click', () => {
        this.uploadTargetProduct = this.selectedProductForModal;
        this.isImageUploadModalOpen = true;
        this.render();
      });
    }

    const closeUploadModalBtn = this.container.querySelector('#closeUploadModalBtn');
    if (closeUploadModalBtn) {
      closeUploadModalBtn.addEventListener('click', () => {
        this.isImageUploadModalOpen = false;
        this.uploadTargetProduct = null;
        this.render();
      });
    }

    const selectPhotoFileBtn = this.container.querySelector('#selectPhotoFileBtn');
    const phonePhotoFileInput = this.container.querySelector('#phonePhotoFileInput') as HTMLInputElement;
    const uploadPreviewImg = this.container.querySelector('#uploadPreviewImg') as HTMLImageElement;
    const uploadFileInfoLabel = this.container.querySelector('#uploadFileInfoLabel');
    const uploadErrorMsg = this.container.querySelector('#uploadErrorMsg') as HTMLElement;
    const confirmSavePhotoBtn = this.container.querySelector('#confirmSavePhotoBtn') as HTMLButtonElement;

    let pendingDataUrl: string | null = null;
    let pendingFileName = '';

    if (selectPhotoFileBtn && phonePhotoFileInput) {
      selectPhotoFileBtn.addEventListener('click', () => {
        phonePhotoFileInput.click();
      });

      phonePhotoFileInput.addEventListener('change', async () => {
        const file = phonePhotoFileInput.files?.[0];
        if (!file) return;

        if (uploadErrorMsg) uploadErrorMsg.style.display = 'none';

        try {
          // Comprimir y redimensionar en el navegador
          const result = await imageStorage.processAndCompressImage(file);
          pendingDataUrl = result.dataUrl;
          pendingFileName = file.name;

          if (uploadPreviewImg) uploadPreviewImg.src = result.dataUrl;
          if (uploadFileInfoLabel) {
            uploadFileInfoLabel.textContent = `Foto seleccionada: ${file.name} (${result.width}x${result.height} px comprimida)`;
          }
          if (confirmSavePhotoBtn) confirmSavePhotoBtn.disabled = false;
        } catch (err: any) {
          if (uploadErrorMsg) {
            uploadErrorMsg.textContent = err?.message || 'Error al procesar la foto.';
            uploadErrorMsg.style.display = 'block';
          }
        }
      });
    }

    if (confirmSavePhotoBtn) {
      confirmSavePhotoBtn.addEventListener('click', async () => {
        if (!pendingDataUrl || !this.uploadTargetProduct) return;
        try {
          await imageStorage.saveProductImage(this.uploadTargetProduct.id, pendingDataUrl, pendingFileName);
          this.customImages.set(this.uploadTargetProduct.id, pendingDataUrl);
          this.showToast(`Foto guardada para ${this.uploadTargetProduct.name} (Modo demostración en este dispositivo)`);
          this.isImageUploadModalOpen = false;
          this.render();
        } catch (err: any) {
          alert('Error al guardar en IndexedDB: ' + (err?.message || err));
        }
      });
    }

    const deleteCustomPhotoBtn = this.container.querySelector('#deleteCustomPhotoBtn');
    if (deleteCustomPhotoBtn && this.uploadTargetProduct) {
      deleteCustomPhotoBtn.addEventListener('click', async () => {
        try {
          await imageStorage.deleteProductImage(this.uploadTargetProduct!.id);
          this.customImages.delete(this.uploadTargetProduct!.id);
          this.showToast('Foto restaurada al catálogo original');
          this.isImageUploadModalOpen = false;
          this.render();
        } catch (err: any) {
          alert('Error al restaurar foto original: ' + err);
        }
      });
    }
  }

  private async open3DShowroom() {
    this.is3DModalOpen = true;
    this.render();

    // Carga diferida (Dynamic Import) de Three.js y ThreeShowroom solo al abrir el modal
    setTimeout(async () => {
      const canvasContainer = this.container.querySelector('#threeCanvasContainer') as HTMLElement;
      if (canvasContainer) {
        if (this.showroomInstance) {
          this.showroomInstance.dispose();
        }
        if (!ThreeShowroomClass) {
          const mod = await import('./ThreeShowroom.ts');
          ThreeShowroomClass = mod.ThreeShowroom;
        }
        this.showroomInstance = new ThreeShowroomClass(canvasContainer);
      }
    }, 40);
  }

  private close3DShowroom() {
    if (this.showroomInstance) {
      this.showroomInstance.dispose();
      this.showroomInstance = null;
    }
    this.is3DModalOpen = false;
    this.render();
  }
}
