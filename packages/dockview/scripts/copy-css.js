// packages/dockview/scripts/copy-css.js
const path = require('path');
const fs = require('fs');

// Output directory: packages/dockview/dist/styles
const thisPackageDir = path.resolve(__dirname, '..');

const outDir = path.join(thisPackageDir, 'dist', 'styles');

fs.mkdirSync(outDir, { recursive: true });

let sourceCss;
try {
  // Try direct resolution
  sourceCss = require.resolve('@arminmajerie/dockview-core/dist/styles/dockview.css');
} catch (e) {
  console.error('[copy-css.js] ERROR: Could not resolve dockview-core CSS from node_modules:', e);
  process.exit(1);
}

const destCss = path.join(outDir, 'dockview.css');

// Check source CSS exists before copying
if (!fs.existsSync(sourceCss)) {
  console.error(`[copy-css.js] ERROR: Source CSS does not exist: ${sourceCss}`);
  process.exit(1);
}

try {
  fs.copyFileSync(sourceCss, destCss);
} catch (err) {
  console.error('[copy-css.js] ERROR: Failed to copy CSS file:', err);
  process.exit(1);
}
