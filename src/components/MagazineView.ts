import { CATEGORIES, CURRENT_CAMPAIGN, POINTS_LEVELS, PRODUCTS } from '../data/catalog.ts';
import { store } from '../services/store.ts';
import { OrderCustomer, Product } from '../types.ts';
import { ThreeShowroom } from './ThreeShowroom.ts';

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
  private activeTourStep = 0;
  private isTourVisible = true;
  private showroomInstance: ThreeShowroom | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    store.subscribe(() => {
      this.render();
    });
  }

  public init() {
    this.render();
  }

  private getFilteredProducts(): Product[] {
    return PRODUCTS.filter((product) => {
      // Filtro de categoría
      if (this.selectedCategory !== 'todas' && product.category !== this.selectedCategory) {
        return false;
      }
      // Filtro de promociones
      if (this.onlyPromos && !product.isPromo) {
        return false;
      }
      // Filtro de búsqueda
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
      // Default: featured first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });
  }

  public render() {
    const reseller = store.getReseller();
    const cartCount = store.getCartCount();
    const filteredProducts = this.getFilteredProducts();
    const subtotal = store.getSubtotal();
    const totalPoints = store.getTotalPoints();

    this.container.innerHTML = `
      <!-- TOP NAVIGATION BAR (Contrato de 3 zonas) -->
      <header style="position: sticky; top: 0; z-index: 40; background: rgba(250, 248, 245, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border); padding: 12px 16px;">
        <div class="container-narrow" style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <!-- Zona 1: Identidad Aromass -->
          <div style="display: flex; align-items: center; gap: 14px;">
            <a href="#" id="brandLogoLink" style="text-decoration: none; display: flex; flex-direction: column;">
              <span style="font-family: var(--font-serif); font-size: 24px; font-weight: 700; letter-spacing: 0.12em; color: var(--color-text-main); line-height: 1;">AROMASS</span>
              <span style="font-size: 10px; font-weight: 600; letter-spacing: 0.2em; color: var(--color-amber-primary); text-transform: uppercase;">Revista Digital</span>
            </a>
            
            <!-- Reseller Badge Selector -->
            <button id="openResellerModalBtn" class="reseller-pill" style="cursor: pointer; border: 1px solid var(--color-border-dark); background: #FFFFFF;" title="Click para cambiar o copiar enlace de revendedor">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #22C55E; display: inline-block;"></span>
              <span style="font-weight: 600; color: var(--color-text-main);">${reseller.code}</span>
              <span style="display: none; @media(min-width: 640px){ display: inline; }">· ${reseller.name.split(':')[1] || reseller.name}</span>
              <span style="font-size: 10px; color: var(--color-amber-accent); font-weight: 600;">(Cambiar)</span>
            </button>
          </div>

          <!-- Zona 2: Enlaces de navegación rápida (Desktop) -->
          <nav style="display: none; gap: 24px; align-items: center;" class="desktop-nav">
            <a href="#catalogo" style="color: var(--color-text-muted); text-decoration: none; font-weight: 500; font-size: 14px;">Catálogo</a>
            <a href="#puntos" id="navPointsLink" style="color: var(--color-text-muted); text-decoration: none; font-weight: 500; font-size: 14px;">Metas de Puntos</a>
            <button id="openShowroomNavBtn" style="background: none; border: none; font-family: var(--font-sans); color: var(--color-text-muted); font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <span>Showroom 3D</span>
            </button>
            <button id="openAdminNavBtn" style="background: none; border: none; font-family: var(--font-sans); color: var(--color-text-muted); font-size: 14px; font-weight: 500; cursor: pointer;">
              Panel Demo
            </button>
          </nav>

          <!-- Zona 3: Carrito y Acceso Rápido -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="openTourBtn" class="btn btn-outline" style="font-size: 12px; padding: 6px 12px; min-height: 38px; border-color: var(--color-border-dark);" title="Guía paso a paso para la demostración ejecutiva">
              <span>Recorrido Ángel</span>
            </button>
            <button id="openCartTopBtn" class="btn btn-primary" style="position: relative; min-height: 38px; padding: 6px 16px;">
              <span>Carrito</span>
              <span style="font-weight: 700; background: var(--color-amber-accent); padding: 2px 7px; border-radius: 999px; font-size: 12px;">${cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- MAIN CONTENT WRAPPER -->
      <main style="padding-bottom: 90px;">
        <div class="container-narrow" style="padding-top: 20px;">
          
          <!-- BANNER GUIADO: RECORRIDO PARA ÁNGEL (Visible por defecto, colapsable) -->
          ${this.renderTourBanner()}

          <!-- PORTADA DE LA REVISTA (Estilo Revista de Venta Directa) -->
          <section id="portada" style="margin-bottom: 40px; border-radius: var(--radius-xl); overflow: hidden; background: #FFFFFF; border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);">
            <div style="display: grid; grid-template-columns: 1fr; @media (min-width: 900px) { grid-template-columns: 1.1fr 0.9fr; }">
              <!-- Imagen de Campaña -->
              <div style="position: relative; min-height: 280px; max-height: 440px; background: var(--color-sand); overflow: hidden;">
                <img 
                  src="${CURRENT_CAMPAIGN.bannerImage}" 
                  alt="${CURRENT_CAMPAIGN.name}" 
                  referrerpolicy="no-referrer"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <div style="position: absolute; top: 16px; left: 16px; background: rgba(28, 25, 23, 0.85); backdrop-filter: blur(8px); color: #FFFFFF; padding: 6px 14px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; letter-spacing: 0.05em;">
                  CAMPAÑA ${CURRENT_CAMPAIGN.number}
                </div>
              </div>

              <!-- Información Editorial de la Portada -->
              <div style="padding: 32px 24px; display: flex; flex-direction: column; justify-content: center; gap: 16px; background: #FFFFFF;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-amber-primary); font-weight: 600;">
                  <span>Edición de Temporada</span>
                  <span aria-hidden="true">·</span>
                  <span>Vigencia: ${CURRENT_CAMPAIGN.startDate} al ${CURRENT_CAMPAIGN.endDate}</span>
                </div>

                <h1 style="font-size: clamp(26px, 3.5vw, 38px); line-height: 1.15; color: var(--color-text-main);">
                  ${CURRENT_CAMPAIGN.name}
                </h1>

                <p style="font-size: 16px; color: var(--color-text-muted); line-height: 1.5;">
                  ${CURRENT_CAMPAIGN.slogan}
                </p>

                <!-- Aviso de Fecha Límite de Pedidos -->
                <div style="background: var(--color-surface-subtle); border-left: 3px solid var(--color-amber-accent); padding: 12px 16px; border-radius: 4px; font-size: 13px; color: var(--color-text-main);">
                  <strong>Fecha de Cierre para Pedidos:</strong> ${CURRENT_CAMPAIGN.orderDeadline}
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">
                    Los pedidos se envían directamente por WhatsApp a tu revendedor asignado.
                  </div>
                </div>

                <!-- Botones de Acción de Portada -->
                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
                  <a href="#catalogo" class="btn btn-amber" style="text-decoration: none;">
                    Explorar Catálogo de Productos
                  </a>
                  <button id="openShowroomCoverBtn" class="btn btn-outline">
                    Probar en Visor 3D Interactivo
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- SECCIÓN: BUSCADOR, CATEGORÍAS Y FILTROS -->
          <section id="catalogo" style="margin-bottom: 28px;">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              
              <!-- Barra de Búsqueda y Ordenamiento -->
              <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                <!-- Input de Búsqueda -->
                <div style="position: relative; flex: 1; min-width: 260px;">
                  <input 
                    type="text" 
                    id="catalogSearchInput" 
                    placeholder="Buscar por fragancia, familia olfativa, sándalo, difusor..." 
                    value="${this.searchQuery}"
                    style="width: 100%; height: 44px; padding: 0 16px 0 40px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: #FFFFFF; font-family: var(--font-sans); font-size: 14px; color: var(--color-text-main); outline: none; transition: border-color 0.2s;"
                  />
                  <span style="position: absolute; left: 14px; top: 13px; color: var(--color-text-light); pointer-events: none;">
                    🔍
                  </span>
                  ${
                    this.searchQuery
                      ? `<button id="clearSearchBtn" style="position: absolute; right: 12px; top: 12px; background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 16px;">✕</button>`
                      : ''
                  }
                </div>

                <!-- Controles de Filtro -->
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <!-- Checkbox de solo promos -->
                  <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid ${this.onlyPromos ? 'var(--color-amber-accent)' : 'var(--color-border)'}; background: ${this.onlyPromos ? 'var(--color-amber-soft)' : '#FFFFFF'};">
                    <input type="checkbox" id="promoOnlyCheckbox" ${this.onlyPromos ? 'checked' : ''} style="cursor: pointer;" />
                    <span>Solo Promociones</span>
                  </label>

                  <!-- Selector de Orden -->
                  <select id="sortBySelect" style="height: 44px; padding: 0 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: #FFFFFF; font-family: var(--font-sans); font-size: 13px; color: var(--color-text-main); cursor: pointer; outline: none;">
                    <option value="featured" ${this.sortBy === 'featured' ? 'selected' : ''}>Ordenar: Destacados</option>
                    <option value="price-asc" ${this.sortBy === 'price-asc' ? 'selected' : ''}>Precio: Menor a Mayor</option>
                    <option value="price-desc" ${this.sortBy === 'price-desc' ? 'selected' : ''}>Precio: Mayor a Menor</option>
                    <option value="points-desc" ${this.sortBy === 'points-desc' ? 'selected' : ''}>Más Puntos</option>
                  </select>
                </div>
              </div>

              <!-- Pestañas de Categorías (Scroll Horizontal en Mobile) -->
              <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none;">
                ${CATEGORIES.map(
                  (cat) => `
                  <button 
                    class="category-tab-btn" 
                    data-category-id="${cat.id}"
                    style="white-space: nowrap; padding: 8px 16px; border-radius: var(--radius-md); border: 1px solid ${this.selectedCategory === cat.id ? 'var(--color-text-main)' : 'var(--color-border)'}; background: ${this.selectedCategory === cat.id ? 'var(--color-text-main)' : '#FFFFFF'}; color: ${this.selectedCategory === cat.id ? '#FFFFFF' : 'var(--color-text-main)'}; font-family: var(--font-sans); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;"
                  >
                    ${cat.label}
                  </button>
                `
                ).join('')}
              </div>

            </div>
          </section>

          <!-- GRILLA DE PRODUCTOS -->
          <section style="margin-bottom: 48px;">
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px;">
              <h2 style="font-size: 22px; color: var(--color-text-main);">
                ${this.getCategoryTitle()}
              </h2>
              <span style="font-size: 13px; color: var(--color-text-muted);">
                ${filteredProducts.length} productos disponibles
              </span>
            </div>

            ${
              filteredProducts.length === 0
                ? `
                <div style="text-align: center; padding: 60px 20px; background: #FFFFFF; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
                  <div style="font-size: 36px; margin-bottom: 12px;">🌿</div>
                  <h3 style="font-size: 18px; margin-bottom: 8px;">No se encontraron productos</h3>
                  <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 16px;">
                    Intentá buscar con otro término o seleccioná otra categoría.
                  </p>
                  <button id="resetFiltersBtn" class="btn btn-outline">Restablecer Filtros</button>
                </div>
              `
                : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                  ${filteredProducts.map((p) => this.renderProductCard(p)).join('')}
                </div>
              `
            }
          </section>

          <!-- SECCIÓN: METAS DE PUNTOS Y BENEFICIOS -->
          <section id="puntos" style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 28px 24px; margin-bottom: 48px;">
            <div style="max-width: 760px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 12px; font-weight: 700; color: var(--color-amber-primary); letter-spacing: 0.1em; text-transform: uppercase;">
                  PROGRAMA DE BENEFICIOS AROMASS
                </span>
                <h2 style="font-size: 26px; margin-top: 4px; color: var(--color-text-main);">
                  Acumulación de Puntos Comerciales
                </h2>
                <p style="font-size: 14px; color: var(--color-text-muted); margin-top: 6px;">
                  Cada producto del catálogo suma puntos independientes del precio en pesos. Al alcanzar cada nivel, tu pedido califica para beneficios especiales coordinados con tu revendedor.
                </p>
              </div>

              <!-- Puntos actuales en carrito -->
              <div style="background: var(--color-surface-subtle); border-radius: var(--radius-lg); padding: 18px 20px; margin-bottom: 24px; border: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 14px; font-weight: 600;">Puntos en tu pedido actual:</span>
                  <span style="font-size: 18px; font-weight: 700; color: var(--color-amber-primary);" class="tabular-nums">
                    ${totalPoints} puntos
                  </span>
                </div>
                
                <div class="points-bar-bg">
                  <div class="points-bar-fill" style="width: ${Math.min(100, (totalPoints / 85) * 100)}%;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-muted); margin-top: 6px;">
                  <span>0 pts</span>
                  <span>Nivel 1 (35 pts)</span>
                  <span>Nivel 2 (60 pts)</span>
                  <span>Nivel 3 (85 pts)</span>
                </div>
              </div>

              <!-- Tabla de Niveles -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                ${POINTS_LEVELS.map(
                  (lvl) => `
                  <div style="padding: 16px; border-radius: var(--radius-md); border: 1px solid ${totalPoints >= lvl.points ? 'var(--color-amber-accent)' : 'var(--color-border)'}; background: ${totalPoints >= lvl.points ? 'var(--color-amber-soft)' : '#FAFAF9'};">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                      <span style="font-weight: 700; font-size: 15px; color: var(--color-text-main);">${lvl.title}</span>
                      ${totalPoints >= lvl.points ? `<span style="color: #16A34A; font-size: 13px; font-weight: 700;">✓ Alcanzado</span>` : `<span style="color: var(--color-text-light); font-size: 12px;">Faltan ${lvl.points - totalPoints} pts</span>`}
                    </div>
                    <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.4;">
                      ${lvl.benefit}
                    </p>
                  </div>
                `
                ).join('')}
              </div>

              <div style="margin-top: 18px; text-align: center; font-size: 12px; color: var(--color-text-light);">
                * Los beneficios son incentivos de demostración sujetos a confirmación y política comercial final de Aromass.
              </div>
            </div>
          </section>

          <!-- FOOTER INSTITUCIONAL -->
          <footer style="border-top: 1px solid var(--color-border); padding: 32px 0 20px 0; text-align: center; color: var(--color-text-muted); font-size: 13px;">
            <div style="font-family: var(--font-serif); font-size: 20px; font-weight: 700; color: var(--color-text-main); margin-bottom: 8px;">
              AROMASS
            </div>
            <p style="margin-bottom: 12px;">
              Revista Digital Interactiva & Sistema de Comercialización por Catálogo
            </p>
            <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;">
              <span>Revendedor Activo: <strong>${reseller.code} — ${reseller.name}</strong></span>
              <span>·</span>
              <button id="footerAdminBtn" style="background: none; border: none; color: var(--color-amber-primary); font-size: 13px; cursor: pointer; text-decoration: underline;">
                Acceso al Panel de Administración
              </button>
            </div>
            <div style="font-size: 12px; color: var(--color-text-light);">
              Prototipo funcional desarrollado para evaluación comercial. No requiere instalación de aplicación.
            </div>
          </footer>

        </div>
      </main>

      <!-- BARRA DE NAVEGACIÓN INFERIOR (Mobile Thumb Navigation) -->
      <div class="bottom-nav">
        <a href="#portada" class="nav-item ${this.selectedCategory === 'todas' ? 'active' : ''}">
          <span style="font-size: 18px;">📖</span>
          <span>Revista</span>
        </a>
        <a href="#catalogo" class="nav-item">
          <span style="font-size: 18px;">🌿</span>
          <span>Catálogo</span>
        </a>
        <button id="bottomNavCartBtn" class="nav-item">
          <span style="font-size: 18px; position: relative;">
            🛒
            ${cartCount > 0 ? `<span class="badge-count">${cartCount}</span>` : ''}
          </span>
          <span>Carrito ($${subtotal.toLocaleString('es-AR')})</span>
        </button>
        <button id="bottomNav3DBtn" class="nav-item">
          <span style="font-size: 18px;">✨</span>
          <span>Showroom 3D</span>
        </button>
        <button id="bottomNavAdminBtn" class="nav-item">
          <span style="font-size: 18px;">⚙️</span>
          <span>Admin</span>
        </button>
      </div>

      <!-- MODALES DE LA APLICACIÓN -->
      ${this.renderProductDetailModal()}
      ${this.renderCartModal()}
      ${this.renderCheckoutModal()}
      ${this.render3DShowroomModal()}
      ${this.renderAdminModal()}
      ${this.renderResellerModal()}
    `;

    this.attachEventListeners();
  }

  private renderTourBanner(): string {
    if (!this.isTourVisible) {
      return `
        <div style="margin-bottom: 16px; text-align: right;">
          <button id="showTourBtn" style="background: none; border: 1px solid var(--color-border); padding: 4px 12px; border-radius: var(--radius-sm); font-size: 12px; color: var(--color-text-muted); cursor: pointer;">
            👁️ Mostrar Guía de Demostración para Ángel
          </button>
        </div>
      `;
    }

    const steps = [
      { num: 1, title: 'Acceso y Revendedor', desc: 'El cliente ingresa mediante enlace o QR con código de revendedor asociado (?revendedor=AR001).' },
      { num: 2, title: 'Portada Sensorial', desc: 'Identidad visual Aromass con campaña vigente, fechas de cierre y promociones destacadas.' },
      { num: 3, title: 'Exploración y Filtros', desc: 'Navegación por categorías de aromatizantes, difusores, repuestos, textil y combos.' },
      { num: 4, title: 'Precios y Puntos', desc: 'Cada producto muestra precio de venta ($) y puntos comerciales acumulables.' },
      { num: 5, title: 'Ficha Técnica y 3D', desc: 'Notas de salida, corazón y fondo + visualizador 3D interactivo con atomización.' },
      { num: 6, title: 'Carga al Carrito', desc: 'Selección de cantidades con cálculo automático de subtotales y total sin recargar.' },
      { num: 7, title: 'Escala de Puntos', desc: 'Metas comerciales de 35, 60 y 85 puntos con incentivos para aumentar el ticket.' },
      { num: 8, title: 'Datos del Cliente', desc: 'Formulario simple y directo para entrega y contacto sin registro forzoso.' },
      { num: 9, title: 'Generación WhatsApp', desc: 'Mensaje estructurado con productos, cantidades, total y código del revendedor listo para enviar.' },
      { num: 10, title: 'Panel de Demostración', desc: 'Auditoría de pedidos recibidos, stock, márgenes de prueba y gestión de campañas.' },
    ];

    const current = steps[this.activeTourStep];

    return `
      <div class="tour-banner">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--color-amber-accent); color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                Recorrido de Demostración para Ángel
              </span>
              <span style="font-size: 12px; color: #D4C7BA;">Paso ${current.num} de 10</span>
            </div>
            <button id="hideTourBtn" style="background: none; border: none; color: #948A80; cursor: pointer; font-size: 16px;">✕</button>
          </div>

          <h3 style="font-size: 17px; color: #FFFFFF; margin-bottom: 4px;">
            ${current.num}. ${current.title}
          </h3>
          <p style="font-size: 13px; color: #E7E5E4; line-height: 1.4;">
            ${current.desc}
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; shrink-0;">
          <button id="tourPrevBtn" class="btn btn-outline" style="min-height: 36px; padding: 6px 12px; font-size: 12px; background: rgba(255, 255, 255, 0.1); color: #FFF; border-color: rgba(255, 255, 255, 0.2);" ${this.activeTourStep === 0 ? 'disabled' : ''}>
            Anterior
          </button>
          <button id="tourNextBtn" class="btn btn-amber" style="min-height: 36px; padding: 6px 14px; font-size: 12px;">
            ${this.activeTourStep === 9 ? 'Reiniciar' : 'Siguiente Paso →'}
          </button>
        </div>
      </div>
    `;
  }

  private renderProductCard(product: Product): string {
    const isPromo = Boolean(product.isPromo);

    return `
      <div class="product-card" data-product-id="${product.id}">
        <!-- Contenedor de Imagen -->
        <div class="product-image-container">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="product-image" 
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          
          <!-- Badges de Estado -->
          <div style="position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 6px;">
            ${
              isPromo
                ? `<span style="background: var(--color-amber-primary); color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">${product.promoLabel || 'PROMO'}</span>`
                : ''
            }
            ${
              product.status === 'demo_item'
                ? `<span style="background: rgba(41, 37, 36, 0.85); color: #E7E5E4; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">Demostración</span>`
                : `<span style="background: rgba(22, 101, 52, 0.85); color: #FFFFFF; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">Confirmado</span>`
            }
          </div>

          <button 
            class="quick-view-btn" 
            data-view-product-id="${product.id}"
            style="position: absolute; bottom: 10px; right: 10px; background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border); border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm);"
            title="Ver ficha técnica completa y notas olfativas"
          >
            🔍
          </button>
        </div>

        <!-- Cuerpo de la Tarjeta -->
        <div style="padding: 16px; display: flex; flex-direction: column; flex: 1; justify-content: space-between; gap: 12px;">
          <div>
            <!-- Código y Familia Olfativa (Unboxed text) -->
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-muted); margin-bottom: 4px;">
              <span style="font-family: var(--font-mono); font-weight: 600;">${product.code}</span>
              <span aria-hidden="true">·</span>
              <span style="color: var(--color-amber-primary); font-weight: 600;">${product.olfactoryFamily}</span>
            </div>

            <!-- Título del Producto -->
            <h3 style="font-size: 16px; line-height: 1.3; color: var(--color-text-main); margin-bottom: 4px;">
              ${product.name}
            </h3>

            <!-- Volumen / Presentación -->
            <div style="font-size: 12px; color: var(--color-text-light); margin-bottom: 6px;">
              ${product.volume} · ${product.presentation}
            </div>

            <!-- Descripción Breve -->
            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${product.description}
            </p>
          </div>

          <!-- Precios, Puntos y Botón de Compra -->
          <div style="border-top: 1px solid var(--color-border); padding-top: 12px;">
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <span style="font-size: 18px; font-weight: 700; color: var(--color-text-main);" class="tabular-nums">
                  $${product.price.toLocaleString('es-AR')}
                </span>
                ${
                  product.discountPercent
                    ? `<span style="font-size: 12px; color: var(--color-text-light); text-decoration: line-through; margin-left: 6px;">$${Math.round(product.price * (1 + product.discountPercent / 100)).toLocaleString('es-AR')}</span>`
                    : ''
                }
              </div>

              <span style="font-size: 12px; font-weight: 700; color: var(--color-amber-primary); background: var(--color-amber-soft); padding: 2px 8px; border-radius: 4px;" class="tabular-nums">
                +${product.points} pts
              </span>
            </div>

            <!-- Selector de Cantidad y Agregar -->
            <div style="display: flex; gap: 8px;">
              <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-subtle); overflow: hidden;">
                <button class="qty-btn-minus" data-prod-id="${product.id}" style="width: 32px; height: 38px; border: none; background: none; font-size: 16px; font-weight: 600; cursor: pointer;">-</button>
                <input type="text" id="qty-input-${product.id}" value="1" readonly style="width: 32px; height: 38px; border: none; background: none; text-align: center; font-size: 13px; font-weight: 600; font-family: var(--font-sans);" />
                <button class="qty-btn-plus" data-prod-id="${product.id}" style="width: 32px; height: 38px; border: none; background: none; font-size: 16px; font-weight: 600; cursor: pointer;">+</button>
              </div>

              <button 
                class="btn btn-primary add-to-cart-btn" 
                data-add-id="${product.id}"
                style="flex: 1; min-height: 38px; padding: 8px 12px; font-size: 13px;"
              >
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderProductDetailModal(): string {
    const p = this.selectedProductForModal;
    if (!p) return '';

    return `
      <div id="productDetailModal" class="modal-backdrop open">
        <div class="modal-sheet" style="max-width: 680px;">
          <div class="drag-handle"></div>

          <!-- Header con botón cerrar -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid var(--color-border);">
            <div style="font-size: 13px; color: var(--color-amber-primary); font-weight: 600;">
              ${p.code} · ${p.category.toUpperCase()}
            </div>
            <button id="closeDetailModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Contenido scrolleable -->
          <div style="overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            <!-- Imagen y Datos Principales -->
            <div style="display: grid; grid-template-columns: 1fr; @media(min-width: 500px){ grid-template-columns: 1fr 1fr; } gap: 16px;">
              <div style="border-radius: var(--radius-md); overflow: hidden; background: var(--color-sand); aspect-ratio: 1/1;">
                <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
              </div>

              <div style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h2 style="font-size: 20px; color: var(--color-text-main); margin-bottom: 6px;">
                    ${p.name}
                  </h2>
                  <div style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 12px;">
                    Familia: <strong>${p.olfactoryFamily}</strong><br/>
                    Presentación: ${p.volume} (${p.presentation})
                  </div>
                  <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.45;">
                    ${p.description}
                  </p>
                </div>

                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--color-border);">
                  <div style="display: flex; align-items: baseline; justify-content: space-between;">
                    <span style="font-size: 22px; font-weight: 700;" class="tabular-nums">$${p.price.toLocaleString('es-AR')}</span>
                    <span style="font-size: 13px; font-weight: 700; color: var(--color-amber-primary);">+${p.points} puntos</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pirámide de Notas Olfativas -->
            <div style="background: var(--color-surface-subtle); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--color-border);">
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--color-text-main);">
                Pirámide Olfativa
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px;">
                <div style="background: #FFFFFF; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent); margin-bottom: 2px;">Salida</div>
                  <div style="color: var(--color-text-muted);">${p.notes.top}</div>
                </div>
                <div style="background: #FFFFFF; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent); margin-bottom: 2px;">Corazón</div>
                  <div style="color: var(--color-text-muted);">${p.notes.heart}</div>
                </div>
                <div style="background: #FFFFFF; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                  <div style="font-weight: 700; color: var(--color-amber-accent); margin-bottom: 2px;">Fondo</div>
                  <div style="color: var(--color-text-muted);">${p.notes.base}</div>
                </div>
              </div>
            </div>

            <!-- Recomendación de Uso -->
            <div style="font-size: 13px; color: var(--color-text-muted); line-height: 1.4;">
              <strong>Modo de aplicación sugerido:</strong> ${p.recommendedUse}
            </div>

            <!-- Botón para ver en 3D -->
            <button id="inspect3DFromModalBtn" class="btn btn-outline" style="width: 100%; border-color: var(--color-amber-accent); color: var(--color-amber-primary);">
              ✨ Abrir en Visor 3D y Probar Bruma
            </button>
          </div>

          <!-- Footer con Agregar al Carrito -->
          <div style="padding: 16px 20px; border-top: 1px solid var(--color-border); background: #FFFFFF; display: flex; gap: 10px;">
            <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-subtle);">
              <button id="modalQtyMinus" style="width: 38px; height: 44px; border: none; background: none; font-size: 18px; font-weight: 600; cursor: pointer;">-</button>
              <input type="text" id="modalQtyInput" value="1" readonly style="width: 40px; height: 44px; border: none; background: none; text-align: center; font-size: 14px; font-weight: 600;" />
              <button id="modalQtyPlus" style="width: 38px; height: 44px; border: none; background: none; font-size: 18px; font-weight: 600; cursor: pointer;">+</button>
            </div>

            <button id="modalAddToCartBtn" class="btn btn-primary" style="flex: 1; height: 44px;">
              Agregar al Carrito
            </button>
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

          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 18px; color: var(--color-text-main);">Tu Pedido de Catálogo</h2>
              <span style="font-size: 12px; color: var(--color-text-muted);">Revendedor: ${reseller.code} (${reseller.name.split(':')[1] || reseller.name})</span>
            </div>
            <button id="closeCartModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Lista de Items -->
          <div style="overflow-y: auto; padding: 16px 20px; flex: 1; display: flex; flex-direction: column; gap: 14px;">
            ${
              cart.length === 0
                ? `
                <div style="text-align: center; padding: 48px 16px; color: var(--color-text-muted);">
                  <div style="font-size: 32px; margin-bottom: 12px;">🛍️</div>
                  <h3 style="font-size: 16px; margin-bottom: 6px; color: var(--color-text-main);">Tu carrito está vacío</h3>
                  <p style="font-size: 13px; margin-bottom: 16px;">Explorá los productos de la revista y agregá tus fragancias favoritas.</p>
                  <button id="continueShoppingEmptyBtn" class="btn btn-outline">Ir al Catálogo</button>
                </div>
              `
                : `
                <!-- Barra de Progreso de Puntos en Carrito -->
                <div style="background: var(--color-surface-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                    <span>Puntos acumulados:</span>
                    <span style="color: var(--color-amber-primary);">${totalPoints} pts</span>
                  </div>
                  <div class="points-bar-bg">
                    <div class="points-bar-fill" style="width: ${Math.min(100, (totalPoints / 85) * 100)}%;"></div>
                  </div>
                  <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
                    ${
                      totalPoints < 35
                        ? `Te faltan ${35 - totalPoints} pts para bonificar el envío con tu revendedor.`
                        : totalPoints < 60
                          ? `¡Nivel 1 alcanzado! A ${60 - totalPoints} pts del mini difusor bonificado.`
                          : totalPoints < 85
                            ? `¡Nivel 2 alcanzado! A ${85 - totalPoints} pts de la esencia pura bonificada.`
                            : `¡Excelente! Alcanzaste el nivel máximo de beneficios de campaña.`
                    }
                  </div>
                </div>

                ${cart
                  .map(
                    (item) => `
                  <div style="display: flex; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border); align-items: center;">
                    <img src="${item.product.image}" alt="${item.product.name}" style="width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover; background: var(--color-sand);" referrerpolicy="no-referrer" />
                    <div style="flex: 1;">
                      <div style="font-size: 14px; font-weight: 600; color: var(--color-text-main);">${item.product.name}</div>
                      <div style="font-size: 12px; color: var(--color-text-muted);">$${item.product.price.toLocaleString('es-AR')} · ${item.product.points * item.quantity} pts</div>
                    </div>

                    <div style="display: flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                      <button class="cart-item-minus" data-id="${item.product.id}" style="width: 28px; height: 32px; border: none; background: none; cursor: pointer; font-weight: 600;">-</button>
                      <span style="width: 24px; text-align: center; font-size: 12px; font-weight: 700;">${item.quantity}</span>
                      <button class="cart-item-plus" data-id="${item.product.id}" style="width: 28px; height: 32px; border: none; background: none; cursor: pointer; font-weight: 600;">+</button>
                    </div>

                    <button class="cart-item-remove" data-id="${item.product.id}" style="border: none; background: none; color: #DC2626; cursor: pointer; padding: 4px;" title="Eliminar producto">
                      🗑️
                    </button>
                  </div>
                `
                  )
                  .join('')}

                <div style="display: flex; justify-content: flex-end;">
                  <button id="clearCartBtn" style="background: none; border: none; font-size: 12px; color: var(--color-text-light); cursor: pointer; text-decoration: underline;">
                    Vaciar Carrito
                  </button>
                </div>
              `
            }
          </div>

          <!-- Footer con Total y Botón Checkout -->
          ${
            cart.length > 0
              ? `
            <div style="padding: 16px 20px; border-top: 1px solid var(--color-border); background: #FFFFFF; display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 14px; color: var(--color-text-muted);">Total Estimado:</span>
                <span style="font-size: 24px; font-weight: 700; color: var(--color-text-main);" class="tabular-nums">
                  $${subtotal.toLocaleString('es-AR')}
                </span>
              </div>

              <div style="display: flex; gap: 10px;">
                <button id="continueShoppingBtn" class="btn btn-outline" style="flex: 1;">
                  Seguir Explorando
                </button>
                <button id="proceedToCheckoutBtn" class="btn btn-whatsapp" style="flex: 1.4;">
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
        <div class="modal-sheet" style="max-width: 600px;">
          <div class="drag-handle"></div>

          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 18px; color: var(--color-text-main);">Finalizar Pedido por WhatsApp</h2>
              <span style="font-size: 12px; color: var(--color-text-muted);">Revendedor Asignado: <strong>${reseller.code}</strong></span>
            </div>
            <button id="closeCheckoutModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Formulario -->
          <div style="overflow-y: auto; padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Resumen compacto del pedido -->
            <div style="background: var(--color-surface-subtle); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: 13px;">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
                <span>${cart.reduce((s, i) => s + i.quantity, 0)} productos en pedido:</span>
                <span class="tabular-nums">$${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div style="color: var(--color-amber-primary); font-size: 12px; font-weight: 600;">
                +${totalPoints} puntos acumulados en Campaña ${CURRENT_CAMPAIGN.number}
              </div>
            </div>

            <!-- Campos requeridos -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                Nombre y Apellido *
              </label>
              <input type="text" id="customerName" placeholder="Ej: Valentina Morales" style="width: 100%; height: 42px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 14px;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                  Tu WhatsApp *
                </label>
                <input type="tel" id="customerPhone" placeholder="Ej: 11 4455-6677" style="width: 100%; height: 42px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 14px;" />
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                  Localidad / Ciudad *
                </label>
                <input type="text" id="customerCity" placeholder="Ej: Córdoba Capital" style="width: 100%; height: 42px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 14px;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                Dirección de Entrega (Opcional si coordina con revendedor)
              </label>
              <input type="text" id="customerAddress" placeholder="Calle, número, piso o barrio" style="width: 100%; height: 42px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 14px;" />
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                Observaciones o Aclaraciones
              </label>
              <textarea id="customerNotes" rows="2" placeholder="Ej: Entregar preferentemente por la tarde" style="width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-sans); font-size: 13px; resize: none;"></textarea>
            </div>

            <!-- Aviso de Transparencia y Configuración -->
            <div style="background: #FEF3C7; border-left: 3px solid #D97706; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #92400E; line-height: 1.4;">
              <strong>Demostración de Enlace WhatsApp:</strong> Al presionar el botón se abrirá WhatsApp con el mensaje estructurado completo. Destinatario de prueba actual: <code>${waConfig.recipientPhone}</code>.
            </div>

          </div>

          <!-- Footer con Botón Enviar WhatsApp -->
          <div style="padding: 16px 20px; border-top: 1px solid var(--color-border); background: #FFFFFF;">
            <button id="sendWhatsAppOrderBtn" class="btn btn-whatsapp" style="width: 100%; height: 48px; font-size: 15px;">
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
        <div class="modal-sheet" style="max-width: 640px;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 18px; color: var(--color-text-main);">Showroom 3D Aromass</h2>
              <span style="font-size: 12px; color: var(--color-text-muted);">Girá la botella para apreciar el vidrio ámbar y la etiqueta</span>
            </div>
            <button id="close3DModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <!-- Canvas 3D -->
          <div id="threeCanvasContainer" style="width: 100%; height: 360px; background: radial-gradient(circle at center, #F5EFEB 0%, #E8E1DA 100%); position: relative; cursor: grab;">
            <div style="position: absolute; top: 12px; left: 14px; background: rgba(255,255,255,0.85); padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; pointer-events: none;">
              Arrastrá con el dedo o mouse para rotar 360°
            </div>
          </div>

          <!-- Controles del Showroom 3D -->
          <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; background: #FFFFFF;">
            <div style="display: flex; gap: 10px;">
              <button id="sprayMistBtn" class="btn btn-amber" style="flex: 1;">
                💨 Vaporizar Bruma Aromática
              </button>
              <button id="toggleBottleDiffuserBtn" class="btn btn-outline" style="flex: 1;">
                Modo Difusor
              </button>
            </div>

            <!-- Botón WebXR -->
            <div style="background: var(--color-surface-subtle); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12px; color: var(--color-text-muted); display: flex; align-items: center; justify-content: space-between;">
              <span>Experiencia espacial en Android XR / Galaxy XR</span>
              <button id="enterXRSimulatorBtn" style="background: none; border: 1px solid var(--color-border); padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
                Ver en XR
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
        <div class="modal-sheet" style="max-width: 720px; max-height: 90vh;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--color-border);">
            <div>
              <h2 style="font-size: 18px; color: var(--color-text-main);">Panel de Demostración & Control</h2>
              <span style="font-size: 12px; color: var(--color-text-muted);">Auditoría de Pedidos, Revendedores y Campañas</span>
            </div>
            <button id="closeAdminModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            
            <!-- Aviso técnico requerido -->
            <div style="background: #EFF6FF; border-left: 3px solid #3B82F6; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #1E40AF; line-height: 1.4;">
              <strong>Prototipo Demostrativo:</strong> Esta vista permite a la dirección de Aromass verificar cómo se gestionan los pedidos, revendedores y puntos. Los datos se almacenan localmente en el dispositivo para la prueba sin simular un backend falso.
            </div>

            <!-- Configuración del WhatsApp Comercial -->
            <div style="background: var(--color-surface-subtle); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Configuración de WhatsApp de Destino</h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <input type="text" id="adminWaPhone" value="${waConfig.recipientPhone}" placeholder="Código país + número sin espacios" style="flex: 1; height: 38px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 13px;" />
                <button id="saveAdminWaBtn" class="btn btn-primary" style="min-height: 38px; padding: 6px 14px; font-size: 12px;">Guardar Número</button>
              </div>
              <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
                Actualmente configurado para: ${waConfig.recipientName} (${waConfig.recipientPhone})
              </div>
            </div>

            <!-- Pedidos Recibidos -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <h4 style="font-size: 15px; font-weight: 700;">Pedidos Generados en Demostración (${orders.length})</h4>
              </div>

              ${
                orders.length === 0
                  ? `<p style="font-size: 13px; color: var(--color-text-muted);">Aún no se han enviado pedidos en esta sesión.</p>`
                  : `
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${orders
                      .map(
                        (ord) => `
                      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 16px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
                          <span>${ord.id} · ${ord.customer.fullName}</span>
                          <span class="tabular-nums" style="color: var(--color-amber-primary); font-size: 15px;">$${ord.totalAmount.toLocaleString('es-AR')}</span>
                        </div>
                        <div style="color: var(--color-text-muted); font-size: 12px; margin-bottom: 6px;">
                          ${ord.date} · Revendedor: <strong>${ord.resellerCode}</strong> · ${ord.customer.city}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-main); background: var(--color-surface-subtle); padding: 6px 10px; border-radius: 4px;">
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

            <!-- Códigos de Revendedores -->
            <div>
              <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">Revendedores Habilitados</h4>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${resellers
                  .map(
                    (r) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid var(--color-border); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px;">
                    <div>
                      <strong>${r.code}</strong> — ${r.name}
                      <div style="font-size: 11px; color: var(--color-text-muted);">${r.zone} · ${r.level}</div>
                    </div>
                    <button class="select-reseller-btn btn btn-outline" data-reseller-code="${r.code}" style="min-height: 32px; padding: 4px 10px; font-size: 12px;">
                      Activar este
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
        <div class="modal-sheet" style="max-width: 520px;">
          <div class="drag-handle"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--color-border);">
            <h2 style="font-size: 18px; color: var(--color-text-main);">Gestión de Enlace de Revendedor</h2>
            <button id="closeResellerModalBtn" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-text-muted); width: 36px; height: 36px;">✕</button>
          </div>

          <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.45;">
              Cada revendedor de Aromass cuenta con un enlace exclusivo. Al abrirlo, el catálogo registra automáticamente su código y lo asocia al pedido de WhatsApp.
            </p>

            <!-- Enlace del revendedor actual -->
            <div style="background: var(--color-surface-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; color: var(--color-text-main);">
                Enlace Personalizado del Revendedor Actual (${current.code}):
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="resellerShareUrl" readonly value="${currentUrl}" style="flex: 1; height: 38px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 12px; font-family: var(--font-mono); background: #FFF;" />
                <button id="copyResellerLinkBtn" class="btn btn-primary" style="min-height: 38px; padding: 6px 12px; font-size: 12px;">
                  Copiar
                </button>
              </div>
            </div>

            <!-- Selector de revendedores de prueba -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Probar con otro revendedor de demostración:
              </label>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${resellers
                  .map(
                    (r) => `
                  <button class="select-reseller-btn btn ${r.code === current.code ? 'btn-amber' : 'btn-outline'}" data-reseller-code="${r.code}" style="justify-content: space-between; text-align: left; width: 100%;">
                    <span><strong>${r.code}</strong> — ${r.name.split(':')[1] || r.name}</span>
                    <span style="font-size: 11px;">${r.zone}</span>
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

    // 2. Buscador
    const searchInput = this.container.querySelector('#catalogSearchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        const filtered = this.getFilteredProducts();
        // Renderizar solo la sección de productos si es posible o re-render
        this.render();
        const reInput = this.container.querySelector('#catalogSearchInput') as HTMLInputElement;
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
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

    // 4. Orden
    const sortSelect = this.container.querySelector('#sortBySelect') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = (e.target as HTMLSelectElement).value;
        this.render();
      });
    }

    // 5. Botones de Cantidad (+ / -) en Tarjetas
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

    // 6. Botón "Agregar" en Tarjetas
    this.container.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-add-id');
        if (!id) return;
        const product = PRODUCTS.find((p) => p.id === id);
        const input = this.container.querySelector(`#qty-input-${id}`) as HTMLInputElement;
        const qty = input ? parseInt(input.value, 10) || 1 : 1;
        if (product) {
          store.addToCart(product, qty);
          // Visual feedback
          const originalText = (e.currentTarget as HTMLElement).innerHTML;
          (e.currentTarget as HTMLElement).innerHTML = '✓ ¡Agregado!';
          setTimeout(() => {
            (e.currentTarget as HTMLElement).innerHTML = originalText;
          }, 1200);
        }
      });
    });

    // 7. Botón Ficha Rápida
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

    // 8. Modales: Cerrar Ficha
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

    // 9. Carrito: Abrir / Cerrar
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

    // Modificar cantidades en el carrito
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

    // 10. Checkout por WhatsApp
    const proceedToCheckoutBtn = this.container.querySelector('#proceedToCheckoutBtn');
    if (proceedToCheckoutBtn) {
      proceedToCheckoutBtn.addEventListener('click', () => {
        this.isCartOpen = false;
        this.isCheckoutOpen = true;
        this.render();
      });
    }

    const closeCheckoutModalBtn = this.container.querySelector('#closeCheckoutModalBtn');
    if (closeCheckoutModalBtn) {
      closeCheckoutModalBtn.addEventListener('click', () => {
        this.isCheckoutOpen = false;
        this.render();
      });
    }

    const sendWhatsAppOrderBtn = this.container.querySelector('#sendWhatsAppOrderBtn');
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
          alert('Por favor completá los campos obligatorios: Nombre, WhatsApp y Ciudad.');
          return;
        }

        const customer: OrderCustomer = { fullName, whatsapp, city, address, notes };
        const { waUrl } = store.generateWhatsAppMessage(customer);
        store.recordOrder(customer);

        // Abrir WhatsApp en nueva pestaña
        window.open(waUrl, '_blank');

        this.isCheckoutOpen = false;
        store.clearCart();
        alert('¡Pedido generado! Se ha abierto WhatsApp con todos los datos y el código de revendedor listos para enviar.');
        this.render();
      });
    }

    // 11. Showroom 3D
    const openShowroomNavBtn = this.container.querySelector('#openShowroomNavBtn');
    const openShowroomCoverBtn = this.container.querySelector('#openShowroomCoverBtn');
    const bottomNav3DBtn = this.container.querySelector('#bottomNav3DBtn');
    const close3DModalBtn = this.container.querySelector('#close3DModalBtn');

    if (openShowroomNavBtn) openShowroomNavBtn.addEventListener('click', () => this.open3DShowroom());
    if (openShowroomCoverBtn) openShowroomCoverBtn.addEventListener('click', () => this.open3DShowroom());
    if (bottomNav3DBtn) bottomNav3DBtn.addEventListener('click', () => this.open3DShowroom());
    if (close3DModalBtn) {
      close3DModalBtn.addEventListener('click', () => {
        this.close3DShowroom();
      });
    }

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

    const enterXRSimulatorBtn = this.container.querySelector('#enterXRSimulatorBtn');
    if (enterXRSimulatorBtn) {
      enterXRSimulatorBtn.addEventListener('click', () => {
        alert('El modo XR está listo para dispositivos Android XR o simulador en escritorio.');
      });
    }

    // 12. Panel Admin
    const openAdminNavBtn = this.container.querySelector('#openAdminNavBtn');
    const bottomNavAdminBtn = this.container.querySelector('#bottomNavAdminBtn');
    const footerAdminBtn = this.container.querySelector('#footerAdminBtn');
    const closeAdminModalBtn = this.container.querySelector('#closeAdminModalBtn');

    if (openAdminNavBtn) openAdminNavBtn.addEventListener('click', () => { this.isAdminOpen = true; this.render(); });
    if (bottomNavAdminBtn) bottomNavAdminBtn.addEventListener('click', () => { this.isAdminOpen = true; this.render(); });
    if (footerAdminBtn) footerAdminBtn.addEventListener('click', () => { this.isAdminOpen = true; this.render(); });
    if (closeAdminModalBtn) closeAdminModalBtn.addEventListener('click', () => { this.isAdminOpen = false; this.render(); });

    const saveAdminWaBtn = this.container.querySelector('#saveAdminWaBtn');
    if (saveAdminWaBtn) {
      saveAdminWaBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#adminWaPhone') as HTMLInputElement;
        if (input && input.value.trim()) {
          store.setWhatsappConfig(input.value.trim(), 'Comercial Aromass');
          alert('Número de WhatsApp comercial guardado.');
          this.render();
        }
      });
    }

    // 13. Revendedor Modal & Links
    const openResellerModalBtn = this.container.querySelector('#openResellerModalBtn');
    const closeResellerModalBtn = this.container.querySelector('#closeResellerModalBtn');
    if (openResellerModalBtn) openResellerModalBtn.addEventListener('click', () => { this.isResellerModalOpen = true; this.render(); });
    if (closeResellerModalBtn) closeResellerModalBtn.addEventListener('click', () => { this.isResellerModalOpen = false; this.render(); });

    this.container.querySelectorAll('.select-reseller-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).getAttribute('data-reseller-code');
        if (code) {
          store.setReseller(code);
          this.isResellerModalOpen = false;
          this.isAdminOpen = false;
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
          copyResellerLinkBtn.textContent = '¡Copiado!';
          setTimeout(() => { copyResellerLinkBtn.textContent = 'Copiar'; }, 1500);
        }
      });
    }

    // 14. Tour de Ángel
    const openTourBtn = this.container.querySelector('#openTourBtn');
    const showTourBtn = this.container.querySelector('#showTourBtn');
    const hideTourBtn = this.container.querySelector('#hideTourBtn');
    const tourPrevBtn = this.container.querySelector('#tourPrevBtn');
    const tourNextBtn = this.container.querySelector('#tourNextBtn');

    if (openTourBtn) {
      openTourBtn.addEventListener('click', () => {
        this.isTourVisible = true;
        this.activeTourStep = 0;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (showTourBtn) {
      showTourBtn.addEventListener('click', () => {
        this.isTourVisible = true;
        this.render();
      });
    }
    if (hideTourBtn) {
      hideTourBtn.addEventListener('click', () => {
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
          // Al avanzar pasos, abrir componentes relevantes
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

  private open3DShowroom() {
    this.is3DModalOpen = true;
    this.render();
    setTimeout(() => {
      const canvasContainer = this.container.querySelector('#threeCanvasContainer') as HTMLElement;
      if (canvasContainer) {
        if (this.showroomInstance) {
          this.showroomInstance.dispose();
        }
        this.showroomInstance = new ThreeShowroom(canvasContainer);
      }
    }, 50);
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
