import type { CatalogResource } from './catalog-store';
import type { InternalCatalogWriteInput } from './internal-catalog.service';

export type CatalogValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export class CatalogValidationError extends Error {
  issues: CatalogValidationIssue[];

  constructor(issues: CatalogValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'CatalogValidationError';
    this.issues = issues;
  }
}

export function normalizeSlugValue(value?: string) {
  return (value || '')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function cleanText(value?: string) {
  return (value || '').trim();
}

function hasText(value?: string) {
  return cleanText(value).length > 0;
}

function validateSlug(slug: string, label: string, issues: CatalogValidationIssue[]) {
  if (!slug) {
    issues.push({ field: 'slug', message: `${label} requires a friendly URL/slug.`, severity: 'error' });
    return;
  }
  if (slug.length < 2) {
    issues.push({ field: 'slug', message: `${label} slug must be at least 2 characters.`, severity: 'error' });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push({ field: 'slug', message: `${label} slug can only use lowercase letters, numbers and hyphens.`, severity: 'error' });
  }
}

function validateCurrency(input: InternalCatalogWriteInput, issues: CatalogValidationIssue[]) {
  if (input.currency !== undefined && input.currency && !/^[A-Z]{3}$/.test(input.currency)) {
    issues.push({ field: 'currency', message: 'Currency must be a 3-letter code such as GBP.', severity: 'error' });
  }
}

function validatePrice(input: InternalCatalogWriteInput, issues: CatalogValidationIssue[]) {
  if (input.priceFromMinor !== undefined && input.priceFromMinor !== null) {
    if (!Number.isFinite(input.priceFromMinor) || input.priceFromMinor < 0) {
      issues.push({ field: 'priceFromMinor', message: 'Starting price must be zero or more.', severity: 'error' });
    }
  }
}

function optionGroups(input: InternalCatalogWriteInput): any[] {
  const metadata = input.metadataJson || {};
  const groups = (metadata as any).optionGroups;
  return Array.isArray(groups) ? groups : [];
}

function validateOptionGroups(input: InternalCatalogWriteInput, issues: CatalogValidationIssue[]) {
  const groups = optionGroups(input);
  const keys = new Set<string>();

  for (const [index, group] of groups.entries()) {
    const path = `metadataJson.optionGroups.${index}`;
    if (!group || typeof group !== 'object') continue;
    const key = cleanText(group.key || group.pricingKey || group.type || '');
    const label = cleanText(group.label || group.name || key);

    if (!key) {
      issues.push({ field: `${path}.key`, message: `Option group ${index + 1} needs a pricing/config key.`, severity: 'warning' });
    } else if (keys.has(key)) {
      issues.push({ field: `${path}.key`, message: `Duplicate option group key "${key}". Each group needs a unique key.`, severity: 'error' });
    } else {
      keys.add(key);
    }

    if (!label) {
      issues.push({ field: `${path}.label`, message: `Option group ${index + 1} needs a label for the storefront.`, severity: 'warning' });
    }

    const displayType = cleanText(group.displayType || group.display || '');
    if (!displayType) {
      issues.push({ field: `${path}.displayType`, message: `Option group ${label || index + 1} should choose a storefront display type.`, severity: 'warning' });
    }

    const values = Array.isArray(group.values) ? group.values : Array.isArray(group.options) ? group.options : [];
    const allowsCustomSize = Boolean(group.allowCustomSize || group.customSizeEnabled || key === 'custom-size');
    if (values.length === 0 && !allowsCustomSize) {
      issues.push({ field: `${path}.values`, message: `Option group ${label || index + 1} has no values.`, severity: 'warning' });
    }

    if ((key.includes('material') || key.includes('finish')) && values.some((value: any) => value && typeof value === 'object' && !value.sourceId && !value.id && !value.catalogId)) {
      issues.push({ field: `${path}.values`, message: `${label || key} has manually typed values. Link values to the material/finish library so pricing can use them later.`, severity: 'warning' });
    }
  }
}

export function validateCatalogWrite(resource: CatalogResource, input: InternalCatalogWriteInput, mode: 'create' | 'update' | 'upsert') {
  const issues: CatalogValidationIssue[] = [];
  const label = resource === 'products' ? 'Product' : resource === 'categories' ? 'Category' : resource;
  const slug = normalizeSlugValue(input.slug);

  if (mode === 'create' || slug) validateSlug(slug, label, issues);

  if (resource === 'products') {
    if (mode === 'create' && !hasText(input.title) && !hasText(input.name)) {
      issues.push({ field: 'title', message: 'Product requires a product name/title.', severity: 'error' });
    }
    validatePrice(input, issues);
    validateCurrency(input, issues);
    validateOptionGroups(input, issues);
  } else if (resource === 'categories') {
    if (mode === 'create' && !hasText(input.name) && !hasText(input.title)) {
      issues.push({ field: 'name', message: 'Category requires a name.', severity: 'error' });
    }
  } else {
    if (mode === 'create' && !hasText(input.name) && !hasText(input.title)) {
      issues.push({ field: 'name', message: `${label} requires a name.`, severity: 'warning' });
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length) throw new CatalogValidationError(issues);
  return { ok: true, issues, normalizedSlug: slug };
}
