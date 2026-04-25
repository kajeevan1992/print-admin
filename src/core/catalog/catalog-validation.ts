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

function valueId(value: any) {
  return cleanText(value?.id || value?.sourceId || value?.catalogId || value?.pricingKey || value?.label || '');
}

function arrayLength(value: any) {
  return Array.isArray(value) ? value.filter(Boolean).length : 0;
}

function validateOptionGroups(input: InternalCatalogWriteInput, issues: CatalogValidationIssue[]) {
  const groups = optionGroups(input);
  const keys = new Set<string>();
  const valueIdsByKey = new Map<string, Set<string>>();

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

    if (!label) issues.push({ field: `${path}.label`, message: `Option group ${index + 1} needs a label for the storefront.`, severity: 'warning' });

    const displayType = cleanText(group.displayType || group.display || '');
    if (!displayType) issues.push({ field: `${path}.displayType`, message: `Option group ${label || index + 1} should choose a storefront display type.`, severity: 'warning' });

    const values = Array.isArray(group.values) ? group.values : Array.isArray(group.options) ? group.options : [];
    const seenValues = new Set<string>();
    const visibleValues = values.filter((value: any) => !value?.isHidden);
    const allowsCustomSize = Boolean(group.allowCustomSize || group.customSizeEnabled || key === 'custom-size' || displayType === 'custom-size');
    if (values.length === 0 && !allowsCustomSize) issues.push({ field: `${path}.values`, message: `Option group ${label || index + 1} has no values.`, severity: 'warning' });
    if (values.length > 0 && visibleValues.length === 0) issues.push({ field: `${path}.values`, message: `Option group ${label || index + 1} has all values hidden, so customers cannot choose anything.`, severity: 'error' });
    if (group.defaultValueId && !values.some((value: any) => valueId(value) === group.defaultValueId || value?.id === group.defaultValueId)) {
      issues.push({ field: `${path}.defaultValueId`, message: `Option group ${label || key} default value does not exist.`, severity: 'error' });
    }
    if (group.defaultValueId && values.some((value: any) => (valueId(value) === group.defaultValueId || value?.id === group.defaultValueId) && value?.isHidden)) {
      issues.push({ field: `${path}.defaultValueId`, message: `Option group ${label || key} default value is hidden. Choose a visible default.`, severity: 'warning' });
    }
    if (group.displayColumns !== undefined && (!Number.isFinite(Number(group.displayColumns)) || Number(group.displayColumns) < 1 || Number(group.displayColumns) > 4)) {
      issues.push({ field: `${path}.displayColumns`, message: `Option group ${label || key} display columns should be between 1 and 4.`, severity: 'warning' });
    }

    values.forEach((value: any, valueIndex: number) => {
      const id = valueId(value);
      const valuePath = `${path}.values.${valueIndex}`;
      if (!cleanText(value?.label || value?.name)) issues.push({ field: `${valuePath}.label`, message: `${label || key || 'Option group'} value ${valueIndex + 1} needs a customer label.`, severity: 'warning' });
      if (!id) {
        issues.push({ field: `${valuePath}.id`, message: `${label || key || 'Option group'} value ${valueIndex + 1} needs a stable ID or pricing key.`, severity: 'warning' });
      } else if (seenValues.has(id)) {
        issues.push({ field: `${valuePath}.id`, message: `${label || key || 'Option group'} has duplicate value ID/key "${id}".`, severity: 'error' });
      } else {
        seenValues.add(id);
      }
      if ((key === 'size' || group.source === 'size') && !allowsCustomSize && (!Number(value?.width) || !Number(value?.height))) {
        issues.push({ field: valuePath, message: `${cleanText(value?.label) || 'Size value'} needs width and height for sheet-fit pricing.`, severity: 'warning' });
      }
      if (group.displayType === 'swatches' && !cleanText(value?.swatchColor) && !cleanText(value?.imageUrl)) {
        issues.push({ field: `${valuePath}.swatchColor`, message: `${cleanText(value?.label) || 'Swatch value'} should have a colour or image for swatch display.`, severity: 'warning' });
      }
      if (value?.isHidden && value?.isDefault) {
        issues.push({ field: `${valuePath}.isDefault`, message: `${cleanText(value?.label) || 'Option value'} is both hidden and default.`, severity: 'warning' });
      }
    });

    if (key) valueIdsByKey.set(key, seenValues);

    const dimensionMode = cleanText(group.dimensionMode || '');
    const sheetFitMode = cleanText(group.sheetFitMode || '');
    if ((dimensionMode === 'custom-only' || dimensionMode === 'preset-and-custom' || allowsCustomSize) && (!Number(group.maxWidth) || !Number(group.maxHeight))) {
      issues.push({ field: `${path}.customSizeLimits`, message: `${label || key || 'Custom size'} needs maximum width and length/height limits.`, severity: 'warning' });
    }
    if ((sheetFitMode === 'sra3' || sheetFitMode === 'custom-sheet' || sheetFitMode === 'board') && (!Number(group.sourceSheetWidth) || !Number(group.sourceSheetHeight))) {
      issues.push({ field: `${path}.sourceSheet`, message: `${label || key || 'Sheet fit'} needs source sheet/board width and height.`, severity: 'warning' });
    }
    if (sheetFitMode === 'roll' && (!Number(group.sourceSheetWidth) || !Number(group.maxWidth))) {
      issues.push({ field: `${path}.rollLimits`, message: `${label || key || 'Roll product'} needs roll/printer width limits.`, severity: 'warning' });
    }
    if (Number(group.minWidth) && Number(group.maxWidth) && Number(group.minWidth) > Number(group.maxWidth)) {
      issues.push({ field: `${path}.minWidth`, message: `${label || key} minimum width cannot be greater than maximum width.`, severity: 'error' });
    }
    if (Number(group.minHeight) && Number(group.maxHeight) && Number(group.minHeight) > Number(group.maxHeight)) {
      issues.push({ field: `${path}.minHeight`, message: `${label || key} minimum height/length cannot be greater than maximum height/length.`, severity: 'error' });
    }
    if (group.quantityMode === 'range-with-step') {
      if (!Number(group.minQuantity) || !Number(group.maxQuantity) || !Number(group.quantityStep)) {
        issues.push({ field: `${path}.quantityRange`, message: `${label || key || 'Quantity'} range mode needs min, max and step.`, severity: 'warning' });
      }
      if (Number(group.minQuantity) && Number(group.maxQuantity) && Number(group.minQuantity) > Number(group.maxQuantity)) {
        issues.push({ field: `${path}.quantityRange`, message: `${label || key || 'Quantity'} minimum cannot be greater than maximum.`, severity: 'error' });
      }
    }

    if ((key.includes('material') || key.includes('finish') || group.source === 'material' || group.source === 'finish') && values.some((value: any) => value && typeof value === 'object' && !value.sourceId && !value.catalogId)) {
      issues.push({ field: `${path}.values`, message: `${label || key} has manually typed values. Link values to the material/finish library so pricing can use them later.`, severity: 'warning' });
    }

    const compatibilityMode = cleanText(group.compatibilityMode || 'none');
    if (compatibilityMode !== 'none') {
      if (!cleanText(group.compatibilityNotes)) {
        issues.push({ field: `${path}.compatibilityNotes`, message: `${label || key} has compatibility rules enabled. Add a short note so admins know why choices are limited.`, severity: 'warning' });
      }
      const valuesWithRules = values.filter((value: any) =>
        arrayLength(value?.compatibleMaterialIds) ||
        arrayLength(value?.incompatibleMaterialIds) ||
        arrayLength(value?.compatibleFinishIds) ||
        arrayLength(value?.incompatibleFinishIds) ||
        arrayLength(value?.compatiblePrinterIds)
      );
      if (values.length > 0 && valuesWithRules.length === 0) {
        issues.push({ field: `${path}.compatibilityMode`, message: `${label || key} compatibility mode is enabled but no option values have compatibility selections yet.`, severity: 'warning' });
      }
      if ((compatibilityMode === 'finish-to-material' || group.source === 'finish') && values.some((value: any) => arrayLength(value?.compatibleFinishIds))) {
        issues.push({ field: `${path}.values`, message: `${label || key} is a finish group but some values point to compatible finishes. Use compatible materials instead.`, severity: 'warning' });
      }
      if ((compatibilityMode === 'material-to-finish' || group.source === 'material') && values.some((value: any) => arrayLength(value?.compatibleMaterialIds))) {
        issues.push({ field: `${path}.values`, message: `${label || key} is a material group but some values point to compatible materials. Use compatible finishes instead.`, severity: 'warning' });
      }
    }
  }

  for (const [index, group] of groups.entries()) {
    if (!group || typeof group !== 'object') continue;
    const rules = Array.isArray(group.dependencyRules) ? group.dependencyRules : [];
    for (const [ruleIndex, rule] of rules.entries()) {
      const rulePath = `metadataJson.optionGroups.${index}.dependencyRules.${ruleIndex}`;
      const whenGroupKey = cleanText(rule?.whenGroupKey);
      const whenValueId = cleanText(rule?.whenValueId);
      const targetGroupKey = cleanText(rule?.targetGroupKey || group.key || group.pricingKey);
      if (!whenGroupKey) issues.push({ field: `${rulePath}.whenGroupKey`, message: 'Dependency rule needs a source group key.', severity: 'warning' });
      if (!whenValueId) issues.push({ field: `${rulePath}.whenValueId`, message: 'Dependency rule needs a source value ID.', severity: 'warning' });
      if (whenGroupKey && !keys.has(whenGroupKey)) issues.push({ field: `${rulePath}.whenGroupKey`, message: `Dependency rule references unknown group "${whenGroupKey}".`, severity: 'error' });
      if (whenGroupKey && whenValueId && valueIdsByKey.has(whenGroupKey) && !valueIdsByKey.get(whenGroupKey)?.has(whenValueId)) {
        issues.push({ field: `${rulePath}.whenValueId`, message: `Dependency rule references unknown value "${whenValueId}" in group "${whenGroupKey}".`, severity: 'warning' });
      }
      if (targetGroupKey && !keys.has(targetGroupKey)) issues.push({ field: `${rulePath}.targetGroupKey`, message: `Dependency rule target group "${targetGroupKey}" does not exist.`, severity: 'error' });
    }
  }
}

export function validateCatalogWrite(resource: CatalogResource, input: InternalCatalogWriteInput, mode: 'create' | 'update' | 'upsert') {
  const issues: CatalogValidationIssue[] = [];
  const label = resource === 'products' ? 'Product' : resource === 'categories' ? 'Category' : resource;
  const slug = normalizeSlugValue(input.slug);

  if (mode === 'create' || slug) validateSlug(slug, label, issues);

  if (resource === 'products') {
    if (mode === 'create' && !hasText(input.title) && !hasText(input.name)) issues.push({ field: 'title', message: 'Product requires a product name/title.', severity: 'error' });
    validatePrice(input, issues);
    validateCurrency(input, issues);
    validateOptionGroups(input, issues);
  } else if (resource === 'categories') {
    if (mode === 'create' && !hasText(input.name) && !hasText(input.title)) issues.push({ field: 'name', message: 'Category requires a name.', severity: 'error' });
  } else {
    if (mode === 'create' && !hasText(input.name) && !hasText(input.title)) issues.push({ field: 'name', message: `${label} requires a name.`, severity: 'warning' });
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length) throw new CatalogValidationError(issues);
  return { ok: true, issues, normalizedSlug: slug };
}
