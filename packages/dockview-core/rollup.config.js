/* eslint-disable */

const fs = require('fs');
const { join } = require('path');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');

const { name, version, homepage, license } = require('./package.json');
const main = join(__dirname, './scripts/rollupEntryTarget.ts');
const mainNoStyles = join(__dirname, './src/index.ts');
const outputDir = join(__dirname, 'dist');

function bundleCssImports() {
    return {
        name: 'bundle-css-imports',
        load(id) {
            if (!id.endsWith('.css')) {
                return null;
            }

            const css = fs.readFileSync(id, 'utf8');

            return [
                `const css = ${JSON.stringify(css)};`,
                `if (typeof document !== 'undefined' && !document.querySelector('style[data-dockview-core-bundle]')) {`,
                `    const style = document.createElement('style');`,
                `    style.setAttribute('data-dockview-core-bundle', 'true');`,
                `    style.appendChild(document.createTextNode(css));`,
                `    document.head.appendChild(style);`,
                `}`,
                `export default css;`,
            ].join('\n');
        },
    };
}

function outputFile(format, isMinified, withStyles) {
    let filename = join(outputDir, name);

    if (format !== 'umd') {
        filename += `.${format}`;
    }
    if (isMinified) {
        filename += '.min';
    }
    if (!withStyles) {
        filename += '.noStyle';
    }

    return `${filename}.js`;
}

function getInput(options) {
    const { withStyles } = options;

    if (withStyles) {
        return main;
    }

    return mainNoStyles;
}

function createBundle(format, options) {
    const { withStyles, isMinified, isReact } = options;
    const input = getInput(options);
    const file = outputFile(format, isMinified, withStyles, isReact);

    const external = [];

    const output = {
        file,
        format,
        sourcemap: true,
        globals: {},
        banner: [
            `/**`,
            ` * ${name}`,
            ` * @version ${version}`,
            ` * @link ${homepage}`,
            ` * @license ${license}`,
            ` */`,
        ].join('\n'),
    };

    const plugins = [
        typescript({
            tsconfig: 'tsconfig.esm.json',
            compilerOptions: {
                sourceMap: true,
                declaration: false,
                declarationMap: false,
                outDir: undefined,
            },
        }),
    ];

    if (isMinified) {
        plugins.push(terser());
    }
    if (withStyles) {
        plugins.push(bundleCssImports());
    }

    if (format === 'umd') {
        output['name'] = name;
    }

    return {
        input,
        output,
        plugins,
        external,
    };
}

module.exports = [
    // amd
    createBundle('amd', { withStyles: false, isMinified: false }),
    createBundle('amd', { withStyles: true, isMinified: false }),
    createBundle('amd', { withStyles: false, isMinified: true }),
    createBundle('amd', { withStyles: true, isMinified: true }),
    // umd
    createBundle('umd', { withStyles: false, isMinified: false }),
    createBundle('umd', { withStyles: true, isMinified: false }),
    createBundle('umd', { withStyles: false, isMinified: true }),
    createBundle('umd', { withStyles: true, isMinified: true }),
    // cjs
    createBundle('cjs', { withStyles: true, isMinified: false }),
    // esm
    createBundle('esm', { withStyles: true, isMinified: false }),
    createBundle('esm', { withStyles: true, isMinified: true }),
];
