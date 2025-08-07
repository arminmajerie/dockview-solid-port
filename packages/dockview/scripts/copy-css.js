const path = require('path');
const fs = require('fs');

console.log('\n[copy-css.js] Starting CSS copy script...');

// Output directory: packages/dockview/dist/styles
const thisPackageDir = path.resolve(__dirname, '..');
console.log('[copy-css.js] thisPackageDir:', thisPackageDir);

const outDir = path.join(thisPackageDir, 'dist', 'styles');
console.log('[copy-css.js] outDir:', outDir);

fs.mkdirSync(outDir, { recursive: true });
console.log('[copy-css.js] Ensured output directory exists.');

let sourceCss;
try {
  // Try direct resolution
  sourceCss = require.resolve('dockview-core/dist/styles/dockview.css');
  console.log('[copy-css.js] Resolved sourceCss:', sourceCss);
} catch (e) {
  console.error('[copy-css.js] ERROR: Could not resolve dockview-core CSS from node_modules:', e);
  process.exit(1);
}

const destCss = path.join(outDir, 'dockview.css');
console.log('[copy-css.js] destCss:', destCss);

// Check source CSS exists before copying
if (!fs.existsSync(sourceCss)) {
  console.error(`[copy-css.js] ERROR: Source CSS does not exist: ${sourceCss}`);
  process.exit(1);
} else {
  console.log('[copy-css.js] Source CSS exists, proceeding to copy.');
}

try {
  fs.copyFileSync(sourceCss, destCss);
  console.log(`[copy-css.js] SUCCESS: Copied ${sourceCss} -> ${destCss}\n`);
} catch (err) {
  console.error('[copy-css.js] ERROR: Failed to copy CSS file:', err);
  process.exit(1);
}
