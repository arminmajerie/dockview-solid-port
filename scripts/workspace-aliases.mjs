import fs from 'node:fs';
import path from 'node:path';

export function findWorkspaceRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (manifest.workspaces) {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`No npm workspaces root above ${startDir}`);
    }
    current = parent;
  }
}

function workspacePatterns(manifest) {
  if (Array.isArray(manifest.workspaces)) {
    return manifest.workspaces;
  }
  if (manifest.workspaces && Array.isArray(manifest.workspaces.packages)) {
    return manifest.workspaces.packages;
  }
  return [];
}

export function workspacePackageAliases(fromDir) {
  const root = findWorkspaceRoot(fromDir);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  const aliases = {};
  for (const pattern of workspacePatterns(manifest)) {
    const star = pattern.replace(/\\/g, '/').endsWith('/*')
      ? pattern.slice(0, -2)
      : null;
    const dirs = star
      ? fs
          .readdirSync(path.join(root, star), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(root, star, entry.name))
      : [path.join(root, pattern)];
    for (const dir of dirs) {
      const packageJsonPath = path.join(dir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        continue;
      }
      const name = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name;
      if (typeof name === 'string' && name.length > 0) {
        aliases[name] = dir;
      }
    }
  }
  return aliases;
}

export function assertWorkspaceFile(fromDir, packageName, relativePath) {
  const aliases = workspacePackageAliases(fromDir);
  const packageDir = aliases[packageName];
  if (!packageDir) {
    throw new Error(
      `${packageName} is not a workspace package reachable from ${fromDir}`
    );
  }
  const filePath = path.join(packageDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${filePath}. Build ${packageName} before this package.`
    );
  }
  return filePath;
}
