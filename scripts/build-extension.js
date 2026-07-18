/**
 * Post-build packaging for the extension: copies static assets Vite does not
 * emit and writes a per-browser manifest. The JS/HTML bundle (popup, options,
 * dashboard, background) is produced by `vite build` into `dist/`.
 *
 * Usage:
 *   node scripts/build-extension.js                 # Chromium (Chrome/Edge/Brave/…) → dist/
 *   node scripts/build-extension.js --target=chrome # same as above
 *   node scripts/build-extension.js --target=firefox# Firefox → dist-firefox/
 *
 * Chromium and Firefox share the exact same code and assets; only the manifest
 * `background` shape and Firefox's `browser_specific_settings` differ. Vite
 * always emits into `dist/`; the Firefox target mirrors those artifacts into
 * `dist-firefox/` so both unpacked builds can coexist.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const viteOutDir = path.join(root, 'dist');

const VALID_TARGETS = ['chrome', 'firefox'];
const targetArg = process.argv.find(a => a.startsWith('--target='));
const target = (targetArg ? targetArg.split('=')[1] : 'chrome').toLowerCase();
if (!VALID_TARGETS.includes(target)) {
  console.error(`Unknown --target="${target}". Use one of: ${VALID_TARGETS.join(', ')}.`);
  process.exit(1);
}
const outDir = target === 'firefox' ? path.join(root, 'dist-firefox') : viteOutDir;
const rel = p => path.relative(root, p);

if (!fs.existsSync(viteOutDir)) {
  console.error('Dist directory does not exist. Run `vite build` first.');
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Firefox (stable) has no MV3 service-worker background, so we swap it for a
 * non-persistent event page. Our background bundle uses ES-module imports for
 * shared chunks, which Firefox loads via `background.type: "module"`
 * (supported from Firefox 121). `browser_specific_settings.gecko.id` is
 * required for a Firefox add-on. The min version is 128 (the ESR baseline)
 * because `optional_host_permissions` — used for opt-in providers — is only
 * honored from Firefox 128 onward.
 */
function toFirefoxManifest(manifest) {
  const fx = JSON.parse(JSON.stringify(manifest));
  const serviceWorker = fx.background && fx.background.service_worker;
  fx.background = { scripts: [serviceWorker || 'background.js'], type: 'module' };
  fx.browser_specific_settings = {
    gecko: {
      id: 'clousight@users.noreply.github.com',
      strict_min_version: '128.0'
    }
  };
  return fx;
}

// Manifest requires PNGs; regenerate them from public/icons/icon-source.png.
try {
  execSync('node scripts/generate-extension-icons.js', { cwd: root, stdio: 'inherit' });
} catch {
  process.exit(1);
}

console.log(`🔧 Post-processing extension (target: ${target})…`);

// For a non-in-place target (Firefox), mirror Vite's artifacts into the target
// dir. Clean it first so stale hashed chunks from a previous build don't linger
// (Vite empties dist/ itself, but this copy target is ours to manage).
if (outDir !== viteOutDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(viteOutDir, outDir);
  console.log(`📦 vite artifacts → ${rel(outDir)}/`);
}

// Manifest (transformed per target). Source stays untouched in public/.
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));
  const outManifest = target === 'firefox' ? toFirefoxManifest(manifest) : manifest;
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(outManifest, null, 2)}\n`);
  console.log(`📝 manifest.json (${target}) → ${rel(outDir)}/`);
} catch (err) {
  console.error('Error writing manifest.json:', err);
  process.exit(1);
}

// Static assets Vite does not fingerprint/emit.
for (const name of ['icons', 'images', 'css']) {
  const src = path.join(publicDir, name);
  if (!fs.existsSync(src)) {
    continue;
  }
  try {
    copyDir(src, path.join(outDir, name));
    console.log(`🖼️ ${name} → ${rel(outDir)}/${name}/`);
  } catch (err) {
    const fatal = name === 'icons';
    console[fatal ? 'error' : 'warn'](`${fatal ? 'Error' : 'Skipping'} ${name} copy:`, err.message);
    if (fatal) {
      process.exit(1);
    }
  }
}

if (!fs.existsSync(path.join(outDir, 'background.js'))) {
  console.error('Missing background.js — check vite.config.ts rollup input.');
  process.exit(1);
}

const loadHint =
  target === 'firefox'
    ? 'Load in about:debugging → This Firefox → Load Temporary Add-on (pick manifest.json).'
    : 'Load unpacked in chrome://extensions.';
console.log(`\n✅ Extension ready in ${rel(outDir)}/. ${loadHint}`);
