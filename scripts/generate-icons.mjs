/**
 * Generate iOS + web icons from the master app icon PNG.
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Source: assets/appicon.png (1024x1024, transparent background)
 * Requires: npm install -D sharp
 */
import sharp from 'sharp';

const BG_COLOR = '#1a0a2e'; // Match the app's dark indigo theme

// --------------------------------------------------------------------------
// iOS App Icon — 1024x1024 with solid background (no transparency allowed)
// --------------------------------------------------------------------------
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG_COLOR } })
  .composite([{ input: 'assets/appicon.png', gravity: 'centre' }])
  .png()
  .toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
console.log('  iOS AppIcon (1024x1024)');

// --------------------------------------------------------------------------
// iOS Splash Screen — icon centered on 2732x2732 dark background
// --------------------------------------------------------------------------
// Resize icon to ~400px for splash (small and centered)
const splashIcon = await sharp('assets/appicon.png')
  .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const splashBuffer = await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: BG_COLOR },
})
  .composite([{ input: splashIcon, gravity: 'centre' }])
  .png()
  .toBuffer();

for (const suffix of ['', '-1', '-2']) {
  const path = `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${suffix}.png`;
  await sharp(splashBuffer).toFile(path);
  console.log(`  iOS Splash ${suffix || '(3x)'} (2732x2732)`);
}

// --------------------------------------------------------------------------
// Web favicon — 32x32 PNG (better browser support than SVG favicon)
// --------------------------------------------------------------------------
await sharp({ create: { width: 32, height: 32, channels: 4, background: BG_COLOR } })
  .composite([{
    input: await sharp('assets/appicon.png')
      .resize(28, 28, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer(),
    gravity: 'centre',
  }])
  .png()
  .toFile('public/favicon.png');
console.log('  Web favicon (32x32)');

// --------------------------------------------------------------------------
// PWA icons — 192x192, 512x512, 180x180 (apple-touch-icon)
// --------------------------------------------------------------------------
for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
  await sharp({ create: { width: size, height: size, channels: 4, background: BG_COLOR } })
    .composite([{
      input: await sharp('assets/appicon.png')
        .resize(Math.round(size * 0.85), Math.round(size * 0.85), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer(),
      gravity: 'centre',
    }])
    .png()
    .toFile(`public/${name}`);
  console.log(`  PWA ${name} (${size}x${size})`);
}

console.log('\nDone! All icons generated from assets/appicon.png');
