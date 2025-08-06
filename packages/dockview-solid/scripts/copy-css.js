const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '../dist/styles');
const sourceFile = path.join(__dirname, '../../dockview-core/dist/styles/dockview.css');
const targetFile = path.join(outDir, 'dockview.css');

// Ensure the outDir exists, recursively!
fs.mkdirSync(outDir, { recursive: true });

// Copy the CSS file
fs.copyFileSync(sourceFile, targetFile);

console.log(`Copied ${sourceFile} -> ${targetFile}`);
