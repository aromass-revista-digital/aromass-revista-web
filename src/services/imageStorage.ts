/**
 * Servicio de almacenamiento local de imágenes usando IndexedDB nativo.
 * Permite a revendedores o al usuario subir fotos de productos desde su teléfono,
 * comprimirlas y redimensionarlas en el navegador y persistirlas localmente.
 */

const DB_NAME = 'aromass_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_product_images';

export interface StoredImageRecord {
  productId: string;
  dataUrl: string;
  updatedAt: number;
  fileName: string;
}

export class ImageStorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'productId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene la imagen personalizada de un producto si existe en IndexedDB
   */
  public async getProductImage(productId: string): Promise<string | null> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(productId);

        req.onsuccess = () => {
          if (req.result && req.result.dataUrl) {
            resolve(req.result.dataUrl);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Guarda o reemplaza una imagen en IndexedDB para un producto
   */
  public async saveProductImage(productId: string, dataUrl: string, fileName: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredImageRecord = {
        productId,
        dataUrl,
        updatedAt: Date.now(),
        fileName,
      };
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Elimina la imagen personalizada para volver a la foto por defecto
   */
  public async deleteProductImage(productId: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(productId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Valida, redimensiona y comprime una imagen seleccionada desde el teléfono
   */
  public processAndCompressImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      // 1. Validación de Formato
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        return reject(new Error('Formato no compatible. Por favor seleccioná un archivo JPG, JPEG, PNG o WebP.'));
      }

      // 2. Validación de Tamaño (Máx. 5 MB)
      const MAX_SIZE_BYTES = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        return reject(new Error('La imagen excede el límite de 5 MB. Elegí una foto más liviana o tomada en calidad estándar.'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al leer el archivo desde el dispositivo.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
        img.onload = () => {
          // 3. Redimensionamiento en el navegador (Máximo 1080px para aspecto de catálogo)
          const MAX_DIM = 1080;
          let targetWidth = img.width;
          let targetHeight = img.height;

          if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
              targetWidth = MAX_DIM;
            } else {
              targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
              targetHeight = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No se pudo inicializar el procesador gráfico en el navegador.'));

          // Dibujar con suavizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 4. Compresión JPEG / WebP a 85% de calidad
          const outputDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            dataUrl: outputDataUrl,
            width: targetWidth,
            height: targetHeight,
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}

export const imageStorage = new ImageStorageService();
