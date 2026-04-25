import { NextResponse } from 'next/server';
import { listInternalCatalogArray } from '../../../../../src/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '../../../../../src/core/tenant/context';

type Issue = {
  resource: string;
  id?: string;
  slug?: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionGroups(product: any) {
  if (Array.isArray(product.optionGroups)) return product.optionGroups;
  if (Array.isArray(product.metadataJson?.optionGroups)) return product.metadataJson.optionGroups;
  return [];
}

function validateProduct(product: any): Issue[] {
  const issues: Issue[] = [];
  const label = text(product.title || product.name || product.slug || product.id);
  const base = { resource: 'products', id: text(product.id), slug: text(product.slug) };

  if (!text(product.slug)) issues.push({ ...base, field: 'slug', severity: 'error', message: `${label || 'Product'} has no friendly URL.` });
  if (!text(product.title || product.name)) issues.push({ ...base, field: 'title', severity: 'error', message: `${label || 'Product'} has no product name.` });
  if (product.categoryId && !text(product.categoryName)) issues.push({ ...base, field: 'categoryId', severity: 'warning', message: `${label || 'Product'} references a category that was not resolved.` });

  const groups = optionGroups(product);
  if (groups.length === 0) {
    issues.push({ ...base, field: 'optionGroups', severity: 'warning', message: `${label || 'Product'} has no option groups yet.` });
  }

  const keys = new Set<string>();
  for (const [index, group] of groups.entries()) {
    const key = text(group?.key || group?.pricingKey || group?.type);
    const groupLabel = text(group?.label || group?.name || key || `Option group ${index + 1}`);
    if (!key) issues.push({ ...base, field: `optionGroups.${index}.key`, severity: 'warning', message: `${groupLabel} needs a pricing/config key.` });
    if (key && keys.has(key)) issues.push({ ...base, field: `optionGroups.${index}.key`, severity: 'error', message: `Duplicate option group key "${key}".` });
    if (key) keys.add(key);
    if (!text(group?.displayType || group?.display)) issues.push({ ...base, field: `optionGroups.${index}.displayType`, severity: 'warning', message: `${groupLabel} needs a storefront display type.` });

    const values = Array.isArray(group?.values) ? group.values : Array.isArray(group?.options) ? group.options : [];
    const allowsCustomSize = Boolean(group?.allowCustomSize || group?.customSizeEnabled || key === 'custom-size');
    if (values.length === 0 && !allowsCustomSize) issues.push({ ...base, field: `optionGroups.${index}.values`, severity: 'warning', message: `${groupLabel} has no values.` });
    if ((key.includes('material') || key.includes('finish')) && values.some((value: any) => value && typeof value === 'object' && !value.sourceId && !value.catalogId && !value.id)) {
      issues.push({ ...base, field: `optionGroups.${index}.values`, severity: 'warning', message: `${groupLabel} has manually typed values. Link values to libraries before pricing.` });
    }
  }

  return issues;
}

function validateCategory(category: any): Issue[] {
  const issues: Issue[] = [];
  const label = text(category.name || category.slug || category.id);
  const base = { resource: 'categories', id: text(category.id), slug: text(category.slug) };
  if (!text(category.slug)) issues.push({ ...base, field: 'slug', severity: 'error', message: `${label || 'Category'} has no friendly URL.` });
  if (!text(category.name)) issues.push({ ...base, field: 'name', severity: 'error', message: `${label || 'Category'} has no name.` });
  return issues;
}

export async function GET(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const [products, categories] = await Promise.all([
      listInternalCatalogArray(ctx, 'products', { limit: 200 }),
      listInternalCatalogArray(ctx, 'categories', { limit: 200 }),
    ]);
    const issues = [...products.flatMap(validateProduct), ...categories.flatMap(validateCategory)];
    const errors = issues.filter((issue) => issue.severity === 'error').length;
    const warnings = issues.filter((issue) => issue.severity === 'warning').length;
    return NextResponse.json({ ok: true, source: 'internal-core-db', data: { errors, warnings, issues } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation report failed.';
    return NextResponse.json({ ok: false, source: 'internal-core', error: message }, { status: 500 });
  }
}
