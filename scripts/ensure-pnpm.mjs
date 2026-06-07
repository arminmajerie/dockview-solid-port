import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('pnpm/')) {
  console.error(
    [
      'This monorepo uses pnpm (required on exFAT/non-NTFS drives where npm symlinks fail).',
      '',
      '  corepack enable',
      '  pnpm install',
      '',
      'Do not use npm install in this repository.',
    ].join('\n'),
  );
  process.exit(1);
}

const npmrcPath = path.join(rootDir, '.npmrc');
const requiredSettings = [
  ['node-linker', 'hoisted'],
  ['package-import-method', 'copy'],
  ['shamefully-hoist', 'true'],
];

function readNpmrc(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const settings = new Map();

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    settings.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }

  return settings;
}

const settings = readNpmrc(npmrcPath);
let changed = false;

for (const [key, value] of requiredSettings) {
  if (settings.get(key) !== value) {
    settings.set(key, value);
    changed = true;
  }
}

if (changed) {
  const lines = [
    '# exFAT and other non-NTFS volumes cannot create symlinks/junctions.',
    '# Use hoisted layout and copy workspace packages instead of linking them.',
    'node-linker=hoisted',
    'package-import-method=copy',
    '',
    '# Hoist deps to root node_modules for scripts that reference ../../node_modules/.bin/*',
    'shamefully-hoist=true',
    '',
    'auto-install-peers=true',
    '',
  ];

  fs.writeFileSync(npmrcPath, lines.join('\n'));
}

try {
  const output = execFileSync('fsutil', ['fsinfo', 'volumeinfo', path.parse(rootDir).root], {
    encoding: 'utf8',
  });

  if (/File System Name\s*:\s*exFAT/i.test(output)) {
    console.warn(
      'Detected exFAT volume. Workspace packages are installed via copy (package-import-method=copy).',
    );
  }
} catch {
  // fsutil unavailable; skip filesystem check.
}
