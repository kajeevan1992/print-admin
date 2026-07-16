import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src/v0-themes');
const contractsPath = path.resolve(root, 'contracts');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const allowedExternalImports = new Set([
  'react',
  'next/link',
  'next/image',
  'lucide-react',
  'framer-motion',
]);
const forbiddenPatterns = [
  { label: 'network request', pattern: /\bfetch\s*\(/ },
  { label: 'axios request', pattern: /\baxios\b/ },
  { label: 'dynamic module loading', pattern: /\b(?:require|import)\s*\(/ },
  { label: 'server action', pattern: /['"]use server['"]/ },
  { label: 'environment access', pattern: /\bprocess\.env\b/ },
  { label: 'database client', pattern: /\b(?:platformPrisma|PrismaClient)\b/ },
  { label: 'database URL', pattern: /\bDATABASE_URL\b/ },
  { label: 'API route reference', pattern: /['"`]\/api\// },
  { label: 'API credential', pattern: /\bx-api-(?:key|secret)\b/i },
  { label: 'tenant authority', pattern: /\btenantId\b/ },
  { label: 'pricing authority', pattern: /\b(?:calculatePrice|calculateVat|rowPriceMinor|resolveProductConfig)\b/ },
  { label: 'checkout authority', pattern: /\b(?:createCheckout|checkoutSession|stripeSession)\b/ },
];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function inside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateImport(file, packageDirectory, specifier, content, index) {
  const relative = path.relative(process.cwd(), file).replaceAll('\\', '/');
  const line = lineNumber(content, index);
  if (specifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(file), specifier);
    const allowedContract = resolved === contractsPath;
    if (!inside(resolved, packageDirectory) && !allowedContract) {
      return `${relative}:${line} escapes its theme package with import "${specifier}"`;
    }
    return null;
  }
  if (!allowedExternalImports.has(specifier)) {
    return `${relative}:${line} imports non-allowlisted module "${specifier}"`;
  }
  return null;
}

function validateFile(file, packageDirectory) {
  const relative = path.relative(process.cwd(), file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  const errors = [];
  const importPattern = /(?:import|export)\s+(?:[^'"`]+?\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  for (const match of content.matchAll(importPattern)) {
    const importError = validateImport(file, packageDirectory, match[1], content, match.index ?? 0);
    if (importError) errors.push(importError);
  }
  for (const rule of forbiddenPatterns) {
    const match = rule.pattern.exec(content);
    if (match) errors.push(`${relative}:${lineNumber(content, match.index)} contains forbidden ${rule.label}`);
  }
  return errors;
}

function validatePackage(directory) {
  const name = path.basename(directory);
  const errors = [];
  if (!fs.existsSync(directory)) return [`Theme package does not exist: ${directory}`];
  if (!fs.existsSync(path.join(directory, 'manifest.ts'))) errors.push(`${name} is missing manifest.ts`);
  if (!fs.existsSync(path.join(directory, 'index.ts'))) errors.push(`${name} is missing index.ts`);
  const sourceFiles = walk(directory).filter((file) => sourceExtensions.has(path.extname(file)));
  if (!sourceFiles.some((file) => /(?:HomePage|ThemeHomePage)\.tsx$/.test(file))) errors.push(`${name} is missing a homepage component`);
  sourceFiles.forEach((file) => errors.push(...validateFile(file, directory)));
  return errors;
}

function validatePackages() {
  const requestedPackage = argument('--package');
  if (requestedPackage) return validatePackage(path.resolve(requestedPackage));
  if (!fs.existsSync(root)) return ['src/v0-themes is missing.'];
  const packageDirectories = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
  return packageDirectories.flatMap(validatePackage);
}

const errors = validatePackages();
if (errors.length) {
  console.error('\nV0 theme boundary validation failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  console.error('\nTheme packages may contain presentation code only. Move SaaS access into src/theme-runtime adapters.\n');
  process.exit(1);
}

console.log(argument('--package') ? 'V0 theme package validation passed.' : 'V0 theme boundary validation passed.');
