import { MagazineView } from './components/MagazineView.ts';

/**
 * Punto de entrada principal de la Revista Digital AROMASS.
 * Optimizado para carga ultra rápida en teléfonos móviles y conexiones 4G:
 * - Three.js y WebXR se cargan de forma diferida (lazy/dynamic import) solo a demanda.
 * - Registra el Service Worker de la PWA para soporte offline y cache inteligente.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar la Revista Digital Interactiva en el DOM inmediatamente
  const root = document.getElementById('root');
  if (root) {
    const magazine = new MagazineView(root);
    magazine.init();
  }

  // 2. Registrar Service Worker para PWA
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
          // Manejo de actualización de versión
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nueva versión disponible.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Fallo en el registro del Service Worker:', err);
        });
    });
  }
});
