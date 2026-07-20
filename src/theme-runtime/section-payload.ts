const MAX_SECTIONS = 30;
const MAX_SECTION_BYTES = 256 * 1024;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_DEPTH = 6;
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
  if (depth > MAX_DEPTH) throw new Error('Homepage section content is nested too deeply.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) throw new Error('A homepage section text value is too long.');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error('A homepage section list contains too many items.');
    return value.map((item) => safeJsonValue(item, depth + 1));
  }
  if (plainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_KEYS) throw new Error('A homepage section contains too many fields.');
    return entries.reduce<Record<string, unknown>>((output, [key, item]) => {
      if (!BLOCKED_KEYS.has(key)) output[key] = safeJsonValue(item, depth + 1);
      return output;
    }, {});
  }
  return clean(value);
}

function parseSections(value: unknown) {
  if (Array.isArray(value)) return value;
  if (!clean(value)) return [];
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) throw new Error('not-array');
    return parsed;
  } catch {
    throw new Error('Homepage sections must be a valid JSON array.');
  }
}

export function validateStorefrontSectionValues(values: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(values, 'sections')) return values;
  const rows = parseSections(values.sections);
  if (rows.length > MAX_SECTIONS) throw new Error(`Homepage sections cannot contain more than ${MAX_SECTIONS} blocks.`);

  const sections = rows.map((row, index) => {
    if (!plainObject(row)) throw new Error(`Homepage section ${index + 1} must be an object.`);
    const safe = safeJsonValue(row) as Record<string, unknown>;
    const type = clean(safe.type);
    if (!type || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(type)) throw new Error(`Homepage section ${index + 1} has an invalid type.`);
    const id = clean(safe.id);
    if (id && id.length > 120) throw new Error(`Homepage section ${index + 1} has an invalid identifier.`);
    if ('enabled' in safe && typeof safe.enabled !== 'boolean') safe.enabled = safe.enabled !== false && clean(safe.enabled).toLowerCase() !== 'false';
    return safe;
  });

  if (Buffer.byteLength(JSON.stringify(sections), 'utf8') > MAX_SECTION_BYTES) throw new Error('Homepage section content is too large.');
  return { ...values, sections };
}
