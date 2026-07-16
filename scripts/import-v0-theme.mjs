import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [, , sourceInput, slugInput] = process.argv;
const root = process.cwd();
const source = path.resolve(root, String(sourceInput || '').trim());
const slug = String(slugInput || path.basename(source)).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function fail(message) {
  console.error(`Theme import failed: ${message}`);
  process.exit(1);
}

if (!sourceInput) fail('Usage: pnpm theme:import <source-directory> [theme-slug]');
if (!/^[a-z][a-z0-9-]*$/.test(slug)) fail('Theme slug must start with a letter and contain only lowercase letters, numbers and hyphens.');
if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail(`Source directory does not exist: ${source}`);

const destination = path.join(root, 'src/v0-themes', slug);
const adapterDirectory = path.join(root, 'src/theme-runtime/built-in/generated');
const adapterPath = path.join(adapterDirectory, `${slug}.ts`);
const registryPath = path.join(root, 'src/theme-runtime/built-in/generated-v0-themes.ts');
const allowedExtensions = new Set(['.ts', '.tsx', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif']);
const ignoredNames = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vercel']);

if (fs.existsSync(destination)) fail(`Theme package already exists: src/v0-themes/${slug}`);
if (fs.existsSync(adapterPath)) fail(`Theme adapter already exists: ${path.relative(root, adapterPath)}`);

function listFiles(directory, prefix = '') {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name) || entry.name.startsWith('.env')) continue;
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`Symbolic links are not allowed: ${relative}`);
    if (entry.isDirectory()) {
      output.push(...listFiles(absolute, relative));
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(extension)) fail(`Unsupported file type: ${relative}`);
    if (fs.statSync(absolute).size > 5 * 1024 * 1024) fail(`File exceeds 5 MB: ${relative}`);
    output.push(relative);
  }
  return output;
}

const files = listFiles(source);
const manifestRelative = files.find((file) => file.replaceAll('\\', '/') === 'manifest.ts');
const routeRelative = files.find((file) => /(^|\/)RouteViews\.tsx?$/.test(file.replaceAll('\\', '/')));
const homeCandidates = files.filter((file) => /HomePage\.tsx?$/.test(file));
if (!manifestRelative) fail('The package must contain manifest.ts at its root.');
if (homeCandidates.length !== 1) fail('The package must contain exactly one *HomePage.tsx file.');

const manifestSource = fs.readFileSync(path.join(source, manifestRelative), 'utf8');
const manifestExport = manifestSource.match(/export\s+const\s+([A-Za-z0-9_]+)\s*=/)?.[1];
if (!manifestExport) fail('manifest.ts must export one named manifest constant.');
const keyMatch = manifestSource.match(/key\s*:\s*['"]([^'"]+)['"]/);
const themeKey = keyMatch?.[1] || `${slug}-native`;
if (themeKey !== `${slug}-native`) fail(`Manifest key must be "${slug}-native"; found "${themeKey}".`);

let routeExport = '';
if (routeRelative) {
  const routeSource = fs.readFileSync(path.join(source, routeRelative), 'utf8');
  routeExport = routeSource.match(/export\s+const\s+([A-Za-z0-9_]*ROUTE_VIEWS)\s*=/)?.[1] || '';
  if (!routeExport) fail('RouteViews.tsx must export a named constant ending in ROUTE_VIEWS.');
}

function copyFiles() {
  for (const relative of files) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, relative), target);
  }
}

function importPath(relative) {
  return `@/v0-themes/${slug}/${relative.replaceAll('\\', '/').replace(/\.(tsx?|jsx?)$/, '')}`;
}

function identifier(value) {
  const next = value.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  return next || 'ImportedTheme';
}

function writeAdapter() {
  const id = identifier(slug);
  const homeName = `${id}HomePage`;
  const definitionName = `${id.toUpperCase()}_THEME_DEFINITION`;
  const lines = [
    `import ${homeName} from '${importPath(homeCandidates[0])}';`,
    routeRelative ? `import { ${routeExport} } from '${importPath(routeRelative)}';` : '',
    `import { ${manifestExport} } from '${importPath(manifestRelative)}';`,
    `import { renderV0ThemePackage } from '@/theme-runtime/v0-package-adapter';`,
    `import type { StorefrontThemeDefinition } from '@/theme-runtime/types';`,
    '',
    `export const ${definitionName}: StorefrontThemeDefinition = {`,
    `  manifest: { ...${manifestExport}, key: '${slug}-native', aliases: ['${slug}'], source: 'built-in' },`,
    `  renderer: (context) => renderV0ThemePackage(context, {`,
    `    themeKey: '${slug}-native',`,
    `    themeStyle: '${slug}',`,
    `    HomePage: ${homeName},`,
    routeExport ? `    routeViews: ${routeExport},` : '',
    `    widgetAppearance: ${manifestExport}.widgetAppearance,`,
    `  }),`,
    `};`,
    '',
  ].filter((line) => line !== '').join('\n');
  fs.mkdirSync(adapterDirectory, { recursive: true });
  fs.writeFileSync(adapterPath, lines);
}

function rebuildRegistry() {
  const adapters = fs.existsSync(adapterDirectory)
    ? fs.readdirSync(adapterDirectory).filter((name) => name.endsWith('.ts')).sort()
    : [];
  const imports = [];
  const definitions = [];
  for (const file of adapters) {
    const content = fs.readFileSync(path.join(adapterDirectory, file), 'utf8');
    const exportName = content.match(/export\s+const\s+([A-Za-z0-9_]+_THEME_DEFINITION)/)?.[1];
    if (!exportName) fail(`Generated adapter has no theme definition export: ${file}`);
    imports.push(`import { ${exportName} } from '@/theme-runtime/built-in/generated/${file.replace(/\.ts$/, '')}';`);
    definitions.push(`  ${exportName},`);
  }
  fs.writeFileSync(registryPath, [
    `import type { StorefrontThemeDefinition } from '@/theme-runtime/types';`,
    ...imports,
    '',
    'export const GENERATED_V0_THEME_DEFINITIONS: StorefrontThemeDefinition[] = [',
    ...definitions,
    '];',
    '',
  ].join('\n'));
}

try {
  copyFiles();
  execFileSync(process.execPath, [path.join(root, 'scripts/validate-v0-themes.mjs')], { cwd: root, stdio: 'inherit' });
  writeAdapter();
  rebuildRegistry();
  console.log(`Imported and registered ${slug}-native.`);
  console.log(`Package: src/v0-themes/${slug}`);
  console.log(`Adapter: src/theme-runtime/built-in/generated/${slug}.ts`);
} catch (error) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.rmSync(adapterPath, { force: true });
  rebuildRegistry();
  fail(error instanceof Error ? error.message : 'Unknown import error.');
}
