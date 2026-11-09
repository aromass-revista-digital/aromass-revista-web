import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve('public');
const iconSvgPath = path.join(publicDir, 'icon.svg');
const maskableSvgPath = path.join(publicDir, 'icon-maskable.svg');

async function generate() {
  console.log('Generando iconos PNG oficiales de AROMASS...');
  const iconSvg = fs.readFileSync(iconSvgPath);
  const maskableSvg = fs.readFileSync(maskableSvgPath);

  // 1. pwa-192x192.png
  await sharp(iconSvg)
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Creado pwa-192x192.png');

  // 2. pwa-512x512.png
  await sharp(iconSvg)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Creado pwa-512x512.png');

  // 3. pwa-maskable-512x512.png (para Adaptive Icons de Android)
  await sharp(maskableSvg)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Creado pwa-maskable-512x512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(iconSvg)
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Creado apple-touch-icon.png');

  // 5. favicon-32x32.png
  await sharp(iconSvg)
    .resize(32, 32)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Creado favicon-32x32.png');

  // 6. favicon-16x16.png
  await sharp(iconSvg)
    .resize(16, 16)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ Creado favicon-16x16.png');

  // 7. favicon.ico (copia de 32x32 para compatibilidad estándar)
  fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
  console.log('✓ Creado favicon.ico');

  console.log('¡Todos los iconos PNG fueron generados exitosamente!');
}

generate().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
