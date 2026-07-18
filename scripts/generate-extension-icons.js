/**
 * Generates manifest-required PNGs from the official brand source
 * `public/icons/icon-source.png` (Chrome does not use SVG for manifest icons).
 * Run: node scripts/generate-extension-icons.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'public/icons/icon-source.png');
const outDir = path.join(root, 'public/icons');

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error('Missing public/icons/icon-source.png');
    process.exit(1);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run `npm install` (dev dependency `sharp` is required to rasterize PNG icons).');
    process.exit(1);
  }

  const source = fs.readFileSync(sourcePath);
  const sizes = [16, 32, 48, 128];

  for (const size of sizes) {
    const out = path.join(outDir, `icon${size}.png`);
    await sharp(source).resize(size, size).png().toFile(out);
    console.log('Wrote', path.relative(root, out));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
