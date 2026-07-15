/**
 * Post-build steps for the Chrome extension: copy static assets Vite does not emit.
 * The main bundle (popup, options, dashboard, background) is produced by `vite build`.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run `vite build` first.');
  process.exit(1);
}

// Manifest requires PNGs; public/icons may only have icon.svg until rasterized.
try {
  execSync('node scripts/generate-extension-icons.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
} catch {
  process.exit(1);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.log('🔧 Post-processing Chrome extension…');

try {
  const manifestPath = path.join(publicDir, 'manifest.json');
  copyFile(manifestPath, path.join(distDir, 'manifest.json'));
  console.log('📝 manifest.json → dist/');
} catch (err) {
  console.error('Error copying manifest.json:', err);
  process.exit(1);
}

try {
  const iconsDir = path.join(publicDir, 'icons');
  const distIconsDir = path.join(distDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
    fs.readdirSync(iconsDir).forEach(file => {
      const srcPath = path.join(iconsDir, file);
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, path.join(distIconsDir, file));
      }
    });
    console.log('🖼️ icons → dist/icons/');
  }
} catch (err) {
  console.error('Error copying icons:', err);
  process.exit(1);
}

try {
  const imagesDir = path.join(publicDir, 'images');
  const distImagesDir = path.join(distDir, 'images');
  if (fs.existsSync(imagesDir)) {
    fs.mkdirSync(distImagesDir, { recursive: true });
    fs.readdirSync(imagesDir).forEach(file => {
      const srcPath = path.join(imagesDir, file);
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, path.join(distImagesDir, file));
      }
    });
    console.log('🖼️ images → dist/images/');
  }
} catch (err) {
  console.warn('Skipping images copy:', err.message);
}

try {
  const cssDir = path.join(publicDir, 'css');
  const distCssDir = path.join(distDir, 'css');
  if (fs.existsSync(cssDir)) {
    fs.mkdirSync(distCssDir, { recursive: true });
    fs.readdirSync(cssDir).forEach(file => {
      const srcPath = path.join(cssDir, file);
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, path.join(distCssDir, file));
      }
    });
    console.log('🎨 css → dist/css/');
  }
} catch (err) {
  console.warn('Skipping css copy:', err.message);
}

if (!fs.existsSync(path.join(distDir, 'background.js'))) {
  console.error('Missing dist/background.js — check vite.config.ts rollup input.');
  process.exit(1);
}

console.log('\n✅ Extension ready in dist/. Load unpacked in chrome://extensions');
