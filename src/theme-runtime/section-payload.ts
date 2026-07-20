import {
  MAX_STOREFRONT_CONTENT_PAGES,
  normaliseStorefrontPagePath,
  storefrontPagePathIsReserved,
} from '@/theme-runtime/content-pages';

const MAX_SECTIONS = 30;
const MAX_SECTION_BYTES = 256 * 1024;
const MAX_PAGE_BYTES = 768 * 1024;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_DEPTH = 7;
const MAX_STRING_LENGTH = 20_000;
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeJsonValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) throw new Error('Storefront content is nested too deeply.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) throw new Error('A storefront content text value is too long.');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error('A storefront content list contains too many items.');
    return value.map((item) => safeJsonValue(item, depth + 1));
  }
  if (plainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_KEYS) throw new Error('A storefront content object contains too many fields.');
    return entries.reduce<Record<string, unknown>>((output, [key, item]) => {
      if (!BLOCKED_KEYS.has(key)) output[key] = safeJsonValue(item, depth + 1);
      return output;
    }, {});
  }
  return clean(value);
}

function parseArray(value: unknown, label: string) {
  if (Array.isArray(value)) return value;
  if (!clean(value)) return [];
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) throw new Error('not-array');
    return parsed;
  } catch {
    throw new Error(`${label} must be a valid JSON array.`);
  }
}

function boolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  const next = clean(value).toLowerCase();
  if (!next) return fallback;
  return !['false', '0', 'off', 'no'].includes(next);
}

function validateSections(value: unknown, label: string) {
  const rows = parseArray(value, label);
  if (rows.length > MAX_SECTIONS) throw new Error(`${label} cannot contain more than ${MAX_SECTIONS} blocks.`);

  const sections = rows.map((row, index) => {
    if (!plainObject(row)) throw new Error(`${label} block ${index + 1} must be an object.`);
    const safe = safeJsonValue(row) as Record<string, unknown>;
    const type = clean(safe.type);
    if (!type || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(type)) throw new Error(`${label} block ${index + 1} has an invalid type.`);
    const id = clean(safe.id);
    if (id && id.length > 120) throw new Error(`${label} block ${index + 1} has an invalid identifier.`);
    safe.enabled = 'enabled' in safe ? boolean(safe.enabled, true) : true;
    return safe;
  });

  if (Buffer.byteLength(JSON.stringify(sections), 'utf8') > MAX_SECTION_BYTES) throw new Error(`${label} content is too large.`);
  return sections;
}

function validatePages(value: unknown) {
  const rows = parseArray(value, 'Storefront pages');
  if (rows.length > MAX_STOREFRONT_CONTENT_PAGES) throw new Error(`Storefront pages cannot contain more than ${MAX_STOREFRONT_CONTENT_PAGES} pages.`);
  const paths = new Set<string>();

  const pages = rows.map((row, index) => {
    if (!plainObject(row)) throw new Error(`Storefront page ${index + 1} must be an object.`);
    const safe = safeJsonValue(row) as Record<string, unknown>;
    const path = normaliseStorefrontPagePath(safe.path || safe.slug);
    if (!path) throw new Error(`Storefront page ${index + 1} requires a valid path.`);
    if (storefrontPagePathIsReserved(path)) throw new Error(`The storefront page path /${path} is reserved by the SaaS storefront.`);
    if (paths.has(path)) throw new Error(`The storefront page path /${path} is used more than once.`);
    paths.add(path);

    const title = clean(safe.title);
    if (!title) throw new Error(`Storefront page ${index + 1} requires a title.`);
    if (title.length > 180) throw new Error(`Storefront page ${index + 1} title is too long.`);
    const id = clean(safe.id);
    if (id && id.length > 120) throw new Error(`Storefront page ${index + 1} has an invalid identifier.`);

    safe.path = path;
    safe.title = title;
    safe.enabled = 'enabled' in safe ? boolean(safe.enabled, true) : true;
    safe.showInNavigation = boolean(safe.showInNavigation, false);
    safe.noIndex = boolean(safe.noIndex, false);
    safe.navigationOrder = Math.max(0, Math.min(10_000, Number(safe.navigationOrder ?? 900) || 900));
    safe.sections = validateSections(safe.sections, `Storefront page /${path}`);
    return safe;
  });

  if (Buffer.byteLength(JSON.stringify(pages), 'utf8') > MAX_PAGE_BYTES) throw new Error('Storefront page content is too large.');
  return pages;
}

export function validateStorefrontSectionValues(values: Record<string, unknown>) {
  let next = values;
  if (Object.prototype.hasOwnProperty.call(next, 'sections')) next = { ...next, sections: validateSections(next.sections, 'Homepage sections') };
  if (Object.prototype.hasOwnProperty.call(next, 'pages')) next = { ...next, pages: validatePages(next.pages) };
  return next;
}
