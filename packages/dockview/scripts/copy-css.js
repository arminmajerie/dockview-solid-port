const path = require('path');
const fs = require('fs');

// Absolute path to THIS package (e.g. packages/dockview/scripts)
const thisPackageDir = path.resolve(__dirname, '..');

// Output directory: packages/dockview/dist/styles
const outDir = path.join(thisPackageDir, 'dist', 'styles');

// Ensure output directory exists (with recursive: true)
fs.mkdirSync(outDir, { recursive: true });

// Source file: packages/dockview-core/dist/styles/dockview.css
const dockviewCoreDir = path.resolve(thisPackageDir, '..', 'dockview-core');
const sourceCss = path.join(dockviewCoreDir, 'dist', 'styles', 'dockview.css');

// Destination file: packages/dockview/dist/styles/dockview.css
const destCss = path.join(outDir, 'dockview.css');

// Check source CSS exists before copying
if (!fs.existsSync(sourceCss)) {
  console.error(`ERROR: Source CSS does not exist: ${sourceCss}`);
  process.exit(1);
}

fs.copyFileSync(sourceCss, destCss);
console.log(`Copied ${sourceCss} -> ${destCss}`);
