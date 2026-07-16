import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src/v0-themes');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const forbiddenImports = [
  '@/core/',
  '@/theme-runtime/',
  '@/themes/',
  '@/app/',
  '@prisma/client',
  'prisma',
  'stripe',
  'pg',
  'nodemailer',
  'next/headers',
  'next/cookies',
];
const forbiddenPatterns = [
  { label: 'network request', pattern: /\bfetch\s*\(/ },
  { label: 'axios request', pattern: /\baxios\b/ },
  { label: 'environment access', pattern: /\bprocess\.env\b/ },
  { label: 'database client', pattern: /\b(?:platformPrisma|PrismaClient)\b/ },
  { label: 'database URL', pattern: /\bDATABASE_URL\b/ },
  { label: 'API route reference', pattern: /['"`]\/api\// },
  { label: 'API credential', pattern: /\bx-api-(?:key|secret)\b/i },
  { label: 'tenant authority', pattern: /\btenantId\b/ },
  { label: 'pricing authority', pattern: /\b(?:calculatePrice|calculateVat|rowPriceMinor|resolveProductConfig)\b/ },
  { label: 'checkout authority', pattern: /\b(?:createCheckout|checkoutSession|stripeSession)\b/ },
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function validateFile(file) {
  const relative = path.relative(process.cwd(), file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  const errors = [];
  const importPattern = /(?:import|export)\s+(?:[^'"`]+?\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1];
    const forbidden = forbiddenImports.find((prefix) => specifier === prefix || specifier.startsWith(prefix));
    if (forbidden) errors.push(`${relative}:${lineNumber(content, match.index ?? 0)} imports forbidden module "${specifier}"`);
  }
  for (const rule of forbiddenPatterns) {
    const match = rule.pattern.exec(content);
    if (match) errors.push(`${relative}:${lineNumber(content, match.index)} contains forbidden ${rule.label}`);
  }
  return errors;
}

function validatePackages() {
  if (!fs.existsSync(root)) return ['src/v0-themes is missing.'];
  const packageDirectories = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
  const errors = [];
  for (const directory of packageDirectories) {
    const name = path.basename(directory);
    if (!fs.existsSync(path.join(directory, 'manifest.ts'))) errors.push(`src/v0-themes/${name} is missing manifest.ts`);
    const sourceFiles = walk(directory).filter((file) => sourceExtensions.has(path.extname(file)));
    if (!sourceFiles.some((file) => /(?:HomePage|ThemeHomePage)\.tsx$/.test(file))) errors.push(`src/v0-themes/${name} is missing a homepage component`);
    sourceFiles.forEach((file) => errors.push(...validateFile(file)));
  }
  return errors;
}

const errors = validatePackages();
if (errors.length) {
  console.error('\nV0 theme boundary validation failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  console.error('\nTheme packages may contain presentation code only. Move SaaS access into src/theme-runtime adapters.\n');
  process.exit(1);
}

console.log('V0 theme boundary validation passed.');
