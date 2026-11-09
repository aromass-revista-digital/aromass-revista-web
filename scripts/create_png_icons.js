import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // Generar buffer RGBA sin dependencias externas usando zlib
  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (rowSize + 1)); // +1 byte de filtro por fila

  // Colores de marca
  // Fondo: #FAF8F5 (250, 248, 245)
  // Ambar principal: #92400E (146, 64, 14)
  // Dorado: #D97706 (217, 119, 6)
  // Texto/oscuro: #1C1917 (28, 25, 23)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Coordenadas normalizadas [0, 1]
      const nx = x / width;
      const ny = y / height;
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Fondo crema suave
      let r = 250 - Math.floor(ny * 10);
      let g = 248 - Math.floor(ny * 10);
      let b = 245 - Math.floor(ny * 10);
      let a = 255;

      // Si no es maskable, dibujar borde redondeado
      if (!isMaskable && distFromCenter > 0.48) {
        // fuera del marco redondeado
        r = 250; g = 248; b = 245; a = 255;
      }

      // Anillo dorado decorativo
      if (Math.abs(distFromCenter - 0.42) < 0.008) {
        r = 217; g = 119; b = 6;
      }

      // Frasco de perfume estilizado en el centro (ny entre 0.22 y 0.62, nx entre 0.36 y 0.64)
      if (ny >= 0.32 && ny <= 0.60 && nx >= 0.38 && nx <= 0.62) {
        // Cuerpo de la botella
        r = 146; g = 64; b = 14;
        // Brillo lateral
        if (nx >= 0.41 && nx <= 0.44) {
          r = 254; g = 243; b = 199;
        }
      } else if (ny >= 0.26 && ny < 0.32 && nx >= 0.45 && nx <= 0.55) {
        // Cuello dorado
        r = 217; g = 119; b = 6;
      } else if (ny >= 0.20 && ny < 0.26 && nx >= 0.47 && nx <= 0.53) {
        // Tapa/Gatillo negro
        r = 28; g = 25; b = 23;
      }

      // Franja de texto / base estilizada AROMASS (ny entre 0.68 y 0.76, nx entre 0.25 y 0.75)
      if (ny >= 0.68 && ny <= 0.74 && nx >= 0.28 && nx <= 0.72) {
        // Letras geométricas AROMASS
        r = 28; g = 25; b = 23;
      }
      if (ny >= 0.78 && ny <= 0.80 && nx >= 0.38 && nx <= 0.62) {
        r = 146; g = 64; b = 14;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Comprimir los datos con zlib Deflate
  const compressedData = zlib.deflateSync(rawData);

  // Crear Chunks PNG
  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression (Deflate)
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // 3. IDAT Chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(length + 12);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, length + 8));
  chunk.writeInt32BE(crc, length + 8);
  return chunk;
}

// Tabla CRC32 estándar
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// Generar íconos
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, false));

console.log('Iconos PWA generados exitosamente en /public');
