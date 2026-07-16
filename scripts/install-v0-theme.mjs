import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';

const [, , sourceInput, ...flags] = process.argv;
const root = process.cwd();
const themesRoot = path.join(root, 'src/v0-themes');
const dryRun = flags.includes('--dry-run');
const replace = flags.includes('--replace');
const MAX_FILES = 400;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.md', '.txt']);
const forbiddenNames = new Set(['package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'next.config.js', 'next.config.mjs', 'tsconfig.json']);

function fail(message) {
  throw new Error(message);
}

function clean(value) {
  return String(value || '').trim();
}

function manifestValue(content, field) {
  const match = content.match(new RegExp(`^\\s*${field}\\s*:\\s*['\"\\x60]([^'\"\\x60]+)['\"\\x60]\\s*,?`, 'm'));
  return clean(match?.[1]);
}

function inside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function ignoredName(name) {
  return ['node_modules', '.next', '.git', 'dist', 'coverage', '__MACOSX', '.DS_Store'].includes(name);
}

function assertAllowedFile(relative, size) {
  const base = path.basename(relative);
  const extension = path.extname(base).toLowerCase();
  if (base.startsWith('.env')) fail(`Theme package contains forbidden environment file: ${relative}`);
  if (forbiddenNames.has(base)) fail(`Theme package contains forbidden project file: ${relative}`);
  if (!allowedExtensions.has(extension)) fail(`Theme package contains unsupported file type: ${relative}`);
  if (size > MAX_FILE_BYTES) fail(`Theme package file exceeds 5 MB: ${relative}`);
}

function copyDirectory(source, destination, state) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (ignoredName(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) fail(`Theme package contains unsupported symbolic link: ${from}`);
    if (entry.isDirectory()) {
      copyDirectory(from, to, state);
      continue;
    }
    const size = fs.statSync(from).size;
    const relative = path.relative(source, from).replaceAll('\\', '/');
    assertAllowedFile(relative, size);
    state.files += 1;
    state.bytes += size;
    if (state.files > MAX_FILES) fail(`Theme package exceeds ${MAX_FILES} files.`);
    if (state.bytes > MAX_TOTAL_BYTES) fail('Theme package exceeds 25 MB uncompressed.');
    fs.copyFileSync(from, to);
  }
}

async function extractZip(source, destination, state) {
  const archive = await JSZip.loadAsync(fs.readFileSync(source));
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    const raw = entry.name.replaceAll('\\', '/');
    const normal = path.posix.normalize(raw);
    if (!normal || normal === '.' || normal.startsWith('../') || normal.includes('/../') || normal.startsWith('/')) fail(`Unsafe ZIP path: ${raw}`);
    if (normal.split('/').some(ignoredName)) continue;
    const output = path.join(destination, ...normal.split('/'));
    if (!inside(output, destination)) fail(`Unsafe ZIP path: ${raw}`);
    const bytes = await entry.async('nodebuffer');
    assertAllowedFile(normal, bytes.length);
    state.files += 1;
    state.bytes += bytes.length;
    if (state.files > MAX_FILES) fail(`Theme package exceeds ${MAX_FILES} files.`);
    if (state.bytes > MAX_TOTAL_BYTES) fail('Theme package exceeds 25 MB uncompressed.');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bytes);
  }
}

function findPackageRoot(directory) {
  const candidates = [];
  function visit(current, depth) {
    if (depth > 4) return;
    if (fs.existsSync(path.join(current, 'manifest.ts')) && fs.existsSync(path.join(current, 'index.ts'))) candidates.push(current);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && !ignoredName(entry.name)) visit(path.join(current, entry.name), depth + 1);
    }
  }
  visit(directory, 0);
  if (!candidates.length) fail('Theme package must contain manifest.ts and index.ts in the same package root.');
  if (candidates.length > 1) fail('Theme archive contains more than one package root. Install one theme at a time.');
  return candidates[0];
}

function parseVersion(value) {
  const match = clean(value).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) fail(`Invalid semantic version: ${value}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] || '' };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed.`);
}

function packageDigest(directory) {
  const hash = crypto.createHash('sha256');
  const files = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignoredName(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(absolute);
    }
  }
  visit(directory);
  files.sort((left, right) => left.localeCompare(right));
  for (const file of files) {
    hash.update(path.relative(directory, file).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function remove(directory) {
  if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
}

async function main() {
  if (!sourceInput) fail('Usage: pnpm theme:install <theme-folder-or-zip> [--dry-run] [--replace]');
  const source = path.resolve(sourceInput);
  if (!fs.existsSync(source)) fail(`Theme package not found: ${sourceInput}`);
  fs.mkdirSync(themesRoot, { recursive: true });

  const token = `${process.pid}-${Date.now()}`;
  const stagingContainer = path.join(themesRoot, `.incoming-${token}`);
  const backup = path.join(themesRoot, `.backup-${token}`);
  let destination = '';
  let installed = false;

  try {
    const state = { files: 0, bytes: 0 };
    fs.mkdirSync(stagingContainer, { recursive: true });
    if (fs.statSync(source).isDirectory()) copyDirectory(source, stagingContainer, state);
    else if (path.extname(source).toLowerCase() === '.zip') await extractZip(source, stagingContainer, state);
    else fail('Theme source must be a directory or .zip archive.');

    const packageRoot = findPackageRoot(stagingContainer);
    const manifest = fs.readFileSync(path.join(packageRoot, 'manifest.ts'), 'utf8');
    const key = manifestValue(manifest, 'key');
    const name = manifestValue(manifest, 'name');
    const version = manifestValue(manifest, 'version');
    if (!key || !name || !version) fail('manifest.ts must declare key, name and version as string literals.');
    if (!key.endsWith('-native')) fail(`Theme key must end with -native: ${key}`);
    const slug = key.slice(0, -'-native'.length);
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) fail(`Theme key contains an invalid slug: ${key}`);
    parseVersion(version);
    destination = path.join(themesRoot, slug);

    run('node', ['scripts/validate-v0-themes.mjs', '--package', packageRoot]);
    const digest = packageDigest(packageRoot);

    if (fs.existsSync(destination)) {
      const existingManifest = fs.readFileSync(path.join(destination, 'manifest.ts'), 'utf8');
      const existingVersion = manifestValue(existingManifest, 'version');
      const comparison = compareVersions(version, existingVersion);
      if (comparison < 0) fail(`Refusing to downgrade ${key} from ${existingVersion} to ${version}.`);
      if (comparison === 0 && !replace) fail(`${key} ${version} is already installed. Use --replace only for an intentional same-version replacement.`);
    }

    console.log(`Validated ${name} (${key}) v${version}`);
    console.log(`Files: ${state.files}; uncompressed size: ${state.bytes} bytes; SHA-256: ${digest}`);
    if (dryRun) {
      console.log('Dry run complete. No repository files were changed.');
      return;
    }

    if (fs.existsSync(destination)) fs.renameSync(destination, backup);
    fs.mkdirSync(destination, { recursive: true });
    copyDirectory(packageRoot, destination, { files: 0, bytes: 0 });
    installed = true;

    run('node', ['scripts/sync-v0-theme-registry.mjs']);
    run('node', ['scripts/validate-v0-themes.mjs']);

    remove(backup);
    console.log(`Installed ${name} v${version} at src/v0-themes/${slug}.`);
    console.log('Next: review the generated registry changes, run pnpm build, and open a pull request for deployment.');
  } catch (error) {
    if (installed && destination) remove(destination);
    if (fs.existsSync(backup) && destination) fs.renameSync(backup, destination);
    try { run('node', ['scripts/sync-v0-theme-registry.mjs']); } catch {}
    throw error;
  } finally {
    remove(stagingContainer);
    remove(backup);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
