import type { PricingQuoteInputPayload } from './pricing-quote-input';
import type { PrintProductionEstimate } from './print-production-estimator';

export type PricingCostLine = {
  key: string;
  label: string;
  type: 'base' | 'material' | 'print' | 'finish' | 'labour' | 'setup' | 'turnaround' | 'minimum' | 'margin' | 'unknown';
  basis: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
  source?: string;
  warnings: string[];
};

export type PricingCostBreakdown = {
  status: 'calculated-preview' | 'needs-configuration';
  currency: string;
  quantity: number;
  productionUnits: number;
  impressions: number;
  baseMinor: number;
  costSubtotalMinor: number;
  minimumChargeMinor: number;
  marginPercent: number;
  marginMinor: number;
  totalMinor: number;
  lines: PricingCostLine[];
  warnings: string[];
  notes: string[];
};

function number(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function positive(value: unknown): number | undefined {
  const next = number(value);
  return next !== undefined && next > 0 ? next : undefined;
}

function money(value: unknown): number {
  const next = positive(value);
  return next ? Math.round(next) : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

function roleType(line: PricingQuoteInputPayload['lines'][number]): PricingCostLine['type'] {
  const joined = `${line.role} ${line.groupKey} ${line.basis} ${line.pricingKey || ''} ${line.productionCode || ''}`.toLowerCase();
  if (joined.includes('material') || joined.includes('paper') || joined.includes('substrate') || joined.includes('stock')) return 'material';
  if (joined.includes('finish') || joined.includes('laminat') || joined.includes('uv') || joined.includes('fold') || joined.includes('cut')) return 'finish';
  if (joined.includes('turnaround') || joined.includes('rush') || joined.includes('express')) return 'turnaround';
  if (joined.includes('printer') || joined.includes('click') || joined.includes('impression') || joined.includes('print')) return 'print';
  if (joined.includes('setup')) return 'setup';
  if (joined.includes('labour') || joined.includes('labor') || joined.includes('time')) return 'labour';
  if (joined.includes('quantity')) return 'unknown';
  return 'unknown';
}

function basisQuantity(line: PricingQuoteInputPayload['lines'][number], orderQuantity: number, estimate: PrintProductionEstimate): number {
  const basis = lower(line.basis);
  const role = lower(line.role);
  const productionUnits = estimate.sourceUnitsRequired || orderQuantity;
  const impressions = estimate.impressions || productionUnits;
  if (basis.includes('sheet') || basis.includes('board') || basis.includes('source')) return productionUnits;
  if (basis.includes('impression') || basis.includes('click') || basis.includes('print')) return impressions;
  if (basis.includes('unit') || basis.includes('each') || basis.includes('item')) return orderQuantity;
  if (basis.includes('sqm') || basis.includes('m2') || basis.includes('area')) {
    const width = estimate.selectedWidth || line.width || 0;
    const height = estimate.selectedHeight || line.height || 0;
    if (width > 0 && height > 0) return Math.max(0, (width / 1000) * (height / 1000) * orderQuantity);
  }
  if (role.includes('quantity')) return 0;
  return orderQuantity;
}

function optionalCost(line: any, keys: string[]): number {
  for (const key of keys) {
    const direct = money(line?.[key]);
    if (direct) return direct;
    const fromSelected = money(line?.rawSelectedValue?.[key]);
    if (fromSelected) return fromSelected;
    const fromGroup = money(line?.rawGroup?.[key]);
    if (fromGroup) return fromGroup;
  }
  return 0;
}

function optionalNumber(line: any, keys: string[]): number | undefined {
  for (const key of keys) {
    const direct = positive(line?.[key]);
    if (direct) return direct;
    const fromSelected = positive(line?.rawSelectedValue?.[key]);
    if (fromSelected) return fromSelected;
    const fromGroup = positive(line?.rawGroup?.[key]);
    if (fromGroup) return fromGroup;
  }
  return undefined;
}

export function buildPricingCostBreakdown(
  quoteInput: PricingQuoteInputPayload,
  estimate: PrintProductionEstimate,
  orderQuantity: number,
  product: any
): PricingCostBreakdown {
  const warnings: string[] = [...quoteInput.warnings, ...estimate.warnings.map((message) => `Production estimate: ${message}`)];
  const baseMinor = money(product?.priceFromMinor);
  const productionUnits = estimate.sourceUnitsRequired || orderQuantity;
  const impressions = estimate.impressions || productionUnits;
  const lines: PricingCostLine[] = [];

  if (baseMinor > 0) {
    lines.push({
      key: 'base-price',
      label: 'Base product price',
      type: 'base',
      basis: 'per order',
      quantity: 1,
      unitCostMinor: baseMinor,
      totalMinor: baseMinor,
      source: 'product.priceFromMinor',
      warnings: [],
    });
  }

  for (const line of quoteInput.lines) {
    const setupCostMinor = optionalCost(line, ['setupCostMinor', 'setupMinor']);
    const runCostMinor = optionalCost(line, ['runCostMinor', 'unitCostMinor', 'costMinor']);
    const minChargeMinor = optionalCost(line, ['minChargeMinor', 'minimumChargeMinor']);
    const multiplier = optionalNumber(line, ['pricingMultiplier', 'multiplier']) || 1;
    const qty = basisQuantity(line, orderQuantity, estimate);
    const type = roleType(line);
    const lineWarnings: string[] = [...line.warnings];

    if (setupCostMinor > 0) {
      lines.push({
        key: `${line.groupKey}-setup`,
        label: `${line.groupName} setup`,
        type: 'setup',
        basis: 'per order',
        quantity: 1,
        unitCostMinor: setupCostMinor,
        totalMinor: setupCostMinor,
        source: line.pricingKey || line.productionCode,
        warnings: [],
      });
    }

    if (runCostMinor > 0 && qty > 0) {
      lines.push({
        key: `${line.groupKey}-run`,
        label: line.selectedLabel ? `${line.groupName}: ${line.selectedLabel}` : line.groupName,
        type,
        basis: line.basis || 'per ordered unit',
        quantity: Math.round(qty * 1000) / 1000,
        unitCostMinor: runCostMinor,
        totalMinor: Math.round(runCostMinor * qty * multiplier),
        source: line.pricingKey || line.productionCode,
        warnings: lineWarnings,
      });
    }

    if (minChargeMinor > 0) {
      lines.push({
        key: `${line.groupKey}-minimum`,
        label: `${line.groupName} minimum charge`,
        type: 'minimum',
        basis: 'minimum',
        quantity: 1,
        unitCostMinor: minChargeMinor,
        totalMinor: minChargeMinor,
        source: line.pricingKey || line.productionCode,
        warnings: [],
      });
    }
  }

  const minimumChargeMinor = Math.max(baseMinor, ...lines.filter((line) => line.type === 'minimum').map((line) => line.totalMinor), 0);
  const costSubtotalMinor = lines.filter((line) => line.type !== 'minimum').reduce((sum, line) => sum + line.totalMinor, 0);
  const marginPercent = optionalNumber(product, ['pricingMarginPercent', 'marginPercent']) || optionalNumber(product?.metadataJson, ['pricingMarginPercent', 'marginPercent']) || 0;
  const marginMinor = marginPercent > 0 ? Math.round(costSubtotalMinor * (marginPercent / 100)) : 0;
  const totalMinor = Math.max(minimumChargeMinor, costSubtotalMinor + marginMinor);

  if (!baseMinor && costSubtotalMinor === 0) warnings.push('No commercial price components are configured yet. Add setup/run costs or base product price.');
  if (!quoteInput.ready) warnings.push('Pricing input is missing required roles. Complete product option setup before using commercial pricing.');

  return {
    status: warnings.length ? 'needs-configuration' : 'calculated-preview',
    currency: quoteInput.currency || 'GBP',
    quantity: orderQuantity,
    productionUnits,
    impressions,
    baseMinor,
    costSubtotalMinor,
    minimumChargeMinor,
    marginPercent,
    marginMinor,
    totalMinor,
    lines,
    warnings,
    notes: [
      'v215 adds the first real cost breakdown layer for print pricing.',
      'It uses product option pricing fields, selected customer options, and sheet/roll/board production estimates.',
      'This is still internal-first. VAT, delivery, discounts, customer price bands, and full machine/labour timing remain later phases.',
    ],
  };
}
