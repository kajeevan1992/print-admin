import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adapterDirectory = path.join(root, 'src/theme-runtime/built-in/generated');
const registryPath = path.join(root, 'src/theme-runtime/built-in/generated-v0-themes.ts');

if (!fs.existsSync(registryPath)) {
  console.error('Generated v0 theme registry is missing.');
  process.exit(1);
}

const registry = fs.readFileSync(registryPath, 'utf8');
const adapters = fs.existsSync(adapterDirectory)
  ? fs.readdirSync(adapterDirectory).filter((name) => name.endsWith('.ts')).sort()
  : [];

const errors = [];
for (const file of adapters) {
  const source = fs.readFileSync(path.join(adapterDirectory, file), 'utf8');
  const definition = source.match(/export\s+const\s+([A-Za-z0-9_]+_THEME_DEFINITION)/)?.[1];
  if (!definition) {
    errors.push(`${file}: missing exported *_THEME_DEFINITION constant.`);
    continue;
  }
  const modulePath = `@/theme-runtime/built-in/generated/${file.replace(/\.ts$/, '')}`;
  if (!registry.includes(modulePath)) errors.push(`${file}: registry import is missing.`);
  if (!registry.includes(`  ${definition},`)) errors.push(`${file}: registry array entry is missing.`);
}

const importedModules = Array.from(registry.matchAll(/from ['"]@\/theme-runtime\/built-in\/generated\/([^'"]+)['"]/g)).map((match) => `${match[1]}.ts`);
for (const file of importedModules) {
  if (!adapters.includes(file)) errors.push(`${file}: registry references an adapter that does not exist.`);
}

if (errors.length) {
  console.error('Generated v0 theme registry validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Generated v0 theme registry is valid (${adapters.length} imported theme${adapters.length === 1 ? '' : 's'}).`);
