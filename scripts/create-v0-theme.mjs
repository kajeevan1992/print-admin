import fs from 'node:fs';
import path from 'node:path';

const [, , slugInput, ...nameParts] = process.argv;
const slug = String(slugInput || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const displayName = nameParts.join(' ').trim() || slug.split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

if (!slug) {
  console.error('Usage: pnpm theme:create <theme-slug> [Display Name]');
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('Theme slug must start with a letter and contain only lowercase letters, numbers and hyphens.');
  process.exit(1);
}

const root = process.cwd();
const source = path.join(root, 'src/v0-themes/_starter');
const destination = path.join(root, 'src/v0-themes', slug);
if (!fs.existsSync(source)) {
  console.error('Theme starter is missing.');
  process.exit(1);
}
if (fs.existsSync(destination)) {
  console.error(`Theme package already exists: src/v0-themes/${slug}`);
  process.exit(1);
}

const identifier = displayName.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('') || 'Theme';
const replacements = new Map([
  ['__THEME_SLUG__', slug],
  ['__THEME_NAME__', displayName],
  ['__THEME_NAME_UPPER__', identifier],
]);

function copy(directory, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const from = path.join(directory, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copy(from, to);
      continue;
    }
    let content = fs.readFileSync(from, 'utf8');
    for (const [token, value] of replacements) content = content.replaceAll(token, value);
    fs.writeFileSync(to, content);
  }
}

copy(source, destination);
console.log(`Created src/v0-themes/${slug}`);
console.log('Next: design the package in v0, increase its manifest version, then run pnpm theme:check and pnpm theme:registry.');
console.log(`A finished external copy can be reinstalled with: pnpm theme:install <folder-or-zip>`);
