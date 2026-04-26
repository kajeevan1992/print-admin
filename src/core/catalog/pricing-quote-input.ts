import { buildPricingInputSummary } from './pricing-inputs';

type SelectionMap = Record<string, unknown>;

type QuoteInputLine = {
  groupKey: string;
  groupName: string;
  role: string;
  basis: string;
  selectedId?: string;
  selectedLabel?: string;
  selectedValue?: unknown;
  pricingKey?: string;
  quantity?: number;
  width?: number;
  height?: number;
  setupCostMinor?: number;
  runCostMinor?: number;
  minChargeMinor?: number;
  pricingMultiplier?: number;
  productionCode?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  bleed?: number;
  pages?: number;
  sides?: number;
  rawGroup?: unknown;
  rawSelectedValue?: unknown;
  warnings: string[];
};

export type PricingQuoteInputPayload = {
  productId: string;
  productSlug: string;
  productName: string;
  currency: string;
  ready: boolean;
  missingRoles: string[];
  lines: QuoteInputLine[];
  totals: {
    setupCostMinor: number;
    runCostMinor: number;
    minChargeMinor: number;
    multiplier: number;
  };
  warnings: string[];
  pricingEngineStatus: 'input-ready' | 'needs-configuration';
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrUndefined(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function normaliseKey(value: unknown) {
  return text(value).toLowerCase();
}

function optionGroups(product: any) {
  if (Array.isArray(product?.optionGroups)) return product.optionGroups;
  if (Array.isArray(product?.metadataJson?.optionGroups)) return product.metadataJson.optionGroups;
  return [];
}

function valueId(value: any) {
  return text(value?.id || value?.sourceId || value?.pricingKey || value?.slug || value?.label || value?.name);
}

function valueLabel(value: any) {
  return text(value?.label || value?.name || value?.title || value?.pricingKey || value?.id);
}

function groupKey(group: any) {
  return text(group?.key || group?.pricingKey || group?.source || group?.id || group?.name || group?.label);
}

function groupRole(group: any) {
  return text(group?.pricingInputRole || group?.pricingKey || group?.key || group?.source || 'custom');
}

function selectionForGroup(group: any, selections: SelectionMap) {
  const keys = [groupKey(group), group?.id, group?.key, group?.source, group?.pricingKey, group?.pricingInputRole, group?.name, group?.label]
    .map(normaliseKey)
    .filter(Boolean);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(selections, key)) return selections[key];
  }
  return undefined;
}

function findSelectedValue(group: any, selected: unknown) {
  const values = Array.isArray(group?.values) ? group.values : [];
  if (!values.length) return undefined;
  const selectedText = normaliseKey(selected);
  if (!selectedText) return values.find((value: any) => value?.isDefault || value?.default) || values[0];
  return values.find((value: any) => [valueId(value), valueLabel(value), value?.pricingKey, value?.sourceId, value?.slug].map(normaliseKey).includes(selectedText));
}

function valueNumber(selectedValue: any, rawSelection: unknown, key: string) {
  return numberOrUndefined(selectedValue?.[key]) ?? numberOrUndefined((rawSelection as any)?.[key]);
}

export function buildPricingQuoteInputPayload(product: any, selections: SelectionMap = {}): PricingQuoteInputPayload {
  const summary = buildPricingInputSummary(product);
  const groups = optionGroups(product);
  const warnings: string[] = [];
  const lines: QuoteInputLine[] = groups.map((group: any) => {
    const selected = selectionForGroup(group, selections);
    const selectedValue = findSelectedValue(group, selected);
    const role = groupRole(group);
    const key = groupKey(group) || role;
    const lineWarnings: string[] = [];
    if (!role || role === 'custom') lineWarnings.push('No pricing input role set.');
    if (!text(group?.pricingBasis)) lineWarnings.push('No pricing basis set.');
    if (Array.isArray(group?.values) && group.values.length > 0 && !selectedValue) lineWarnings.push('Selection does not match an allowed product option value.');

    const line: QuoteInputLine = {
      groupKey: key,
      groupName: text(group?.name || group?.label || key),
      role,
      basis: text(group?.pricingBasis || selectedValue?.pricingBasis || 'none'),
      selectedId: selectedValue ? valueId(selectedValue) : undefined,
      selectedLabel: selectedValue ? valueLabel(selectedValue) : undefined,
      selectedValue: selected ?? (selectedValue ? valueId(selectedValue) : undefined),
      pricingKey: text(selectedValue?.pricingKey || group?.pricingKey),
      quantity: valueNumber(selectedValue, selected, 'quantity'),
      width: valueNumber(selectedValue, selected, 'width'),
      height: valueNumber(selectedValue, selected, 'height'),
      setupCostMinor: valueNumber(selectedValue, selected, 'setupCostMinor'),
      runCostMinor: valueNumber(selectedValue, selected, 'runCostMinor'),
      minChargeMinor: valueNumber(selectedValue, selected, 'minChargeMinor'),
      pricingMultiplier: valueNumber(selectedValue, selected, 'pricingMultiplier') ?? 1,
      productionCode: text(selectedValue?.productionCode || group?.productionCode),
      sourceWidth: valueNumber(selectedValue, selected, 'sourceWidth') ?? valueNumber(selectedValue, selected, 'sourceWidthMm') ?? valueNumber(group, selected, 'sourceWidth') ?? valueNumber(group, selected, 'sourceWidthMm') ?? valueNumber(group, selected, 'sheetWidthMm') ?? valueNumber(group, selected, 'rollWidthMm') ?? valueNumber(group, selected, 'boardWidthMm'),
      sourceHeight: valueNumber(selectedValue, selected, 'sourceHeight') ?? valueNumber(selectedValue, selected, 'sourceHeightMm') ?? valueNumber(group, selected, 'sourceHeight') ?? valueNumber(group, selected, 'sourceHeightMm') ?? valueNumber(group, selected, 'sheetHeightMm') ?? valueNumber(group, selected, 'rollLengthMm') ?? valueNumber(group, selected, 'boardHeightMm'),
      bleed: valueNumber(selectedValue, selected, 'bleed') ?? valueNumber(selectedValue, selected, 'bleedMm') ?? valueNumber(group, selected, 'bleed') ?? valueNumber(group, selected, 'bleedMm'),
      pages: valueNumber(selectedValue, selected, 'pages') ?? valueNumber(selectedValue, selected, 'pageCount') ?? valueNumber(group, selected, 'pages') ?? valueNumber(group, selected, 'pageCount'),
      sides: valueNumber(selectedValue, selected, 'sides') ?? valueNumber(selectedValue, selected, 'sideCount') ?? valueNumber(group, selected, 'sides') ?? valueNumber(group, selected, 'sideCount'),
      rawGroup: group,
      rawSelectedValue: selectedValue,
      warnings: lineWarnings,
    };
    warnings.push(...lineWarnings.map((message) => `${line.groupName}: ${message}`));
    return line;
  });

  const totals = lines.reduce(
    (acc, line) => {
      acc.setupCostMinor += line.setupCostMinor || 0;
      acc.runCostMinor += line.runCostMinor || 0;
      acc.minChargeMinor = Math.max(acc.minChargeMinor, line.minChargeMinor || 0);
      acc.multiplier *= line.pricingMultiplier || 1;
      return acc;
    },
    { setupCostMinor: 0, runCostMinor: 0, minChargeMinor: 0, multiplier: 1 }
  );

  if (!summary.ready) warnings.push(`Missing required pricing roles: ${summary.missingRoles.join(', ')}`);

  return {
    productId: summary.productId,
    productSlug: summary.productSlug,
    productName: summary.productName,
    currency: text(product?.currency) || 'GBP',
    ready: summary.ready && warnings.length === 0,
    missingRoles: summary.missingRoles,
    lines,
    totals,
    warnings,
    pricingEngineStatus: summary.ready && warnings.length === 0 ? 'input-ready' : 'needs-configuration',
  };
}
