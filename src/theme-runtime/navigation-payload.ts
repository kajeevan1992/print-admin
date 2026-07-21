const MAX_NAVIGATION_ITEMS = 60;
const MAX_TOP_LEVEL_ITEMS = 10;
const MAX_CHILDREN_PER_ITEM = 12;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function cleanText(value: unknown, max: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function cleanSlug(value: unknown) {
  return cleanText(value, 100)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanPath(value: unknown) {
  let path = cleanText(value, 240);
  if (!path) throw new Error('Every navigation item requires an internal storefront path.');
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Navigation links must use internal storefront paths, such as /about or /business-cards.');
  }
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\s+/g, '-').replace(/\/{2,}/g, '/');
  return path;
}

function cleanImage(value: unknown) {
  const image = cleanText(value, 500);
  if (!image) return '';
  if (image.startsWith('/') || /^https:\/\//i.test(image)) return image;
  throw new Error('Navigation feature images must use an HTTPS URL or an internal / path.');
}

function safeObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!FORBIDDEN_KEYS.has(key)) output[key] = item;
  }
  return output;
}

function uniqueId(raw: unknown, label: string, index: number, used: Set<string>) {
  const base = cleanSlug(raw) || cleanSlug(label) || `menu-${index + 1}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export function sanitizeStorefrontNavigation(value: unknown) {
  if (value === null || value === undefined || value === '') return [];
  if (!Array.isArray(value)) throw new Error('Storefront navigation must be a list of menu items.');
  if (value.length > MAX_NAVIGATION_ITEMS) throw new Error(`Storefront navigation supports at most ${MAX_NAVIGATION_ITEMS} items.`);

  const used = new Set<string>();
  const prepared = value.map((entry, index) => {
    const raw = safeObject(entry);
    const label = cleanText(raw.label || raw.name || raw.title, 80);
    if (!label) throw new Error(`Navigation item ${index + 1} requires a label.`);
    const id = uniqueId(raw.id || raw.slug, label, index, used);
    return {
      id,
      slug: cleanSlug(raw.slug || label) || id,
      label,
      path: cleanPath(raw.path || raw.href || raw.url),
      enabled: raw.enabled !== false && raw.status !== 'hidden' && raw.status !== 'disabled',
      order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : (index + 1) * 10,
      parentId: cleanSlug(raw.parentId || raw.parent || raw.parentKey),
      parentSlug: cleanSlug(raw.parentSlug || raw.parentLabel),
      group: cleanText(raw.group || raw.column || 'Menu', 60),
      description: cleanText(raw.description || raw.featureBody, 280),
      imageUrl: cleanImage(raw.imageUrl || raw.image),
    };
  });

  const topItems = prepared.filter((item) => !item.parentId && !item.parentSlug);
  if (topItems.length > MAX_TOP_LEVEL_ITEMS) throw new Error(`Storefront navigation supports at most ${MAX_TOP_LEVEL_ITEMS} top-level items.`);
  const topById = new Map(topItems.map((item) => [item.id, item]));
  const topBySlug = new Map(topItems.map((item) => [item.slug, item]));
  const childCounts = new Map<string, number>();

  for (const item of prepared) {
    if (!item.parentId && !item.parentSlug) continue;
    const parent = topById.get(item.parentId) || topBySlug.get(item.parentSlug);
    if (!parent) throw new Error(`${item.label} references a missing top-level navigation item.`);
    item.parentId = parent.id;
    item.parentSlug = parent.slug;
    const nextCount = (childCounts.get(parent.id) || 0) + 1;
    if (nextCount > MAX_CHILDREN_PER_ITEM) throw new Error(`${parent.label} supports at most ${MAX_CHILDREN_PER_ITEM} dropdown links.`);
    childCounts.set(parent.id, nextCount);
  }

  const topPaths = new Set<string>();
  for (const item of topItems) {
    if (topPaths.has(item.path)) throw new Error(`The top-level navigation path ${item.path} is used more than once.`);
    topPaths.add(item.path);
  }

  return prepared.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function validateStorefrontNavigationValues(values: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(values, 'navigation')) return values;
  return { ...values, navigation: sanitizeStorefrontNavigation(values.navigation) };
}
