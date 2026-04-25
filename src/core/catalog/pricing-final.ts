import { calculatePricingPreview, type PricingCalculationResult } from './pricing-engine';

export type PricingFinalAdjustment = {
  key: string;
  label: string;
  type: 'margin' | 'markup' | 'quantity-break' | 'turnaround' | 'minimum' | 'rounding' | 'manual-rule' | 'note';
  amountMinor: number;
  beforeMinor: number;
  afterMinor: number;
  source?: string;
  notes?: string[];
};

export type PricingFinalResult = {
  status: 'priced-preview' | 'needs-configuration';
  currency: string;
  quantity: number;
  costMinor: number;
  sellPriceMinor: number;
  unitPriceMinor: number;
  minimumChargeMinor: number;
  marginPercent: number;
  markupPercent: number;
  turnaroundMultiplier: number;
  quantityBreak?: Record<string, unknown> | null;
  adjustments: PricingFinalAdjustment[];
  warnings: string[];
  notes: string[];
  calculation: PricingCalculationResult;
};

type PricingRuleSource = Record<string, any>;

function num(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function positive(value: unknown): number | undefined {
  const next = num(value);
  return next !== undefined && next > 0 ? next : undefined;
}

function money(value: unknown): number {
  const next = positive(value);
  return next ? Math.round(next) : 0;
}

function percent(value: unknown): number {
  const next = num(value);
  return next !== undefined && next > 0 ? next : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

function metadata(product: any): PricingRuleSource {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}

function firstNumber(sources: PricingRuleSource[], keys: string[]): number {
  for (const source of sources) {
    for (const key of keys) {
      const value = percent(source?.[key]);
      if (value > 0) return value;
    }
  }
  return 0;
}

function firstMoney(sources: PricingRuleSource[], keys: string[]): number {
  for (const source of sources) {
    for (const key of keys) {
      const value = money(source?.[key]);
      if (value > 0) return value;
    }
  }
  return 0;
}

function arrayFrom(product: any, keys: string[]): any[] {
  const meta = metadata(product);
  for (const key of keys) {
    const value = meta[key] ?? product?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function selectedTurnaround(calculation: PricingCalculationResult): string {
  const line = calculation.quoteInput.lines.find((item) => {
    const joined = `${item.role} ${item.groupKey} ${item.groupName}`.toLowerCase();
    return joined.includes('turnaround') || joined.includes('rush') || joined.includes('delivery-speed');
  });
  return lower(line?.selectedId || line?.selectedLabel || line?.selectedValue || 'standard') || 'standard';
}

function turnaroundMultiplier(product: any, calculation: PricingCalculationResult): { multiplier: number; source?: string } {
  const selected = selectedTurnaround(calculation);
  const meta = metadata(product);
  const map = meta.turnaroundMultipliers || meta.turnaroundPricing || product?.turnaroundMultipliers || {};
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    const value = positive(map[selected]) || positive(map[selected.replace(/\s+/g, '-')]);
    if (value) return { multiplier: value, source: `turnaroundMultipliers.${selected}` };
  }

  const rules = arrayFrom(product, ['turnaroundRules', 'turnaroundOptions', 'turnaroundPricingRules']);
  for (const rule of rules) {
    const key = lower(rule?.id || rule?.slug || rule?.key || rule?.label || rule?.name);
    if (key && (key === selected || key.replace(/\s+/g, '-') === selected)) {
      const value = positive(rule?.multiplier || rule?.pricingMultiplier || rule?.priceMultiplier);
      if (value) return { multiplier: value, source: `turnaroundRules.${key}` };
    }
  }

  const line = calculation.quoteInput.lines.find((item) => lower(`${item.role} ${item.groupKey}`).includes('turnaround'));
  const lineMultiplier = positive(line?.pricingMultiplier || (line as any)?.rawSelectedValue?.pricingMultiplier);
  if (lineMultiplier) return { multiplier: lineMultiplier, source: 'selected turnaround option' };
  return { multiplier: 1 };
}

function findQuantityBreak(product: any, quantity: number): any | null {
  const breaks = arrayFrom(product, ['quantityBreaks', 'pricingQuantityBreaks', 'pricingTiers', 'quantityPricing']);
  let selected: any | null = null;
  for (const row of breaks) {
    const min = positive(row?.minQuantity ?? row?.from ?? row?.min ?? row?.qtyFrom) || 1;
    const max = positive(row?.maxQuantity ?? row?.to ?? row?.max ?? row?.qtyTo) || Number.POSITIVE_INFINITY;
    if (quantity >= min && quantity <= max) {
      if (!selected || min >= (positive(selected?.minQuantity ?? selected?.from ?? selected?.min ?? selected?.qtyFrom) || 1)) selected = row;
    }
  }
  return selected;
}

function addAdjustment(adjustments: PricingFinalAdjustment[], currentMinor: number, amountMinor: number, item: Omit<PricingFinalAdjustment, 'beforeMinor' | 'afterMinor' | 'amountMinor'>) {
  const afterMinor = Math.max(0, currentMinor + Math.round(amountMinor));
  adjustments.push({ ...item, amountMinor: Math.round(amountMinor), beforeMinor: currentMinor, afterMinor });
  return afterMinor;
}

function applyQuantityBreak(currentMinor: number, quantityBreak: any | null, adjustments: PricingFinalAdjustment[], orderQuantity: number) {
  if (!quantityBreak) return currentMinor;
  let next = currentMinor;
  const discountPercent = percent(quantityBreak.discountPercent || quantityBreak.discount || quantityBreak.percentOff);
  const markupPercent = percent(quantityBreak.markupPercent || quantityBreak.surchargePercent);
  const multiplier = positive(quantityBreak.multiplier || quantityBreak.priceMultiplier);
  const unitPriceMinor = money(quantityBreak.unitPriceMinor || quantityBreak.sellUnitMinor || quantityBreak.pricePerUnitMinor);
  const fixedTotalMinor = money(quantityBreak.totalMinor || quantityBreak.sellPriceMinor || quantityBreak.fixedPriceMinor);

  if (fixedTotalMinor > 0) {
    next = addAdjustment(adjustments, next, fixedTotalMinor - next, {
      key: 'quantity-break-fixed-total',
      label: 'Quantity break fixed total',
      type: 'quantity-break',
      source: quantityBreak.id || quantityBreak.label || 'quantityBreaks',
    });
  } else if (unitPriceMinor > 0) {
    const quantity = orderQuantity || positive(quantityBreak.quantity) || positive(quantityBreak.qty) || 1;
    next = addAdjustment(adjustments, next, unitPriceMinor * quantity - next, {
      key: 'quantity-break-unit-price',
      label: 'Quantity break unit price',
      type: 'quantity-break',
      source: quantityBreak.id || quantityBreak.label || 'quantityBreaks',
    });
  } else if (multiplier && multiplier !== 1) {
    next = addAdjustment(adjustments, next, currentMinor * multiplier - currentMinor, {
      key: 'quantity-break-multiplier',
      label: 'Quantity break multiplier',
      type: 'quantity-break',
      source: quantityBreak.id || quantityBreak.label || 'quantityBreaks',
    });
  } else if (discountPercent > 0) {
    next = addAdjustment(adjustments, next, -currentMinor * (discountPercent / 100), {
      key: 'quantity-break-discount',
      label: `Quantity break discount ${discountPercent}%`,
      type: 'quantity-break',
      source: quantityBreak.id || quantityBreak.label || 'quantityBreaks',
    });
  } else if (markupPercent > 0) {
    next = addAdjustment(adjustments, next, currentMinor * (markupPercent / 100), {
      key: 'quantity-break-markup',
      label: `Quantity break markup ${markupPercent}%`,
      type: 'quantity-break',
      source: quantityBreak.id || quantityBreak.label || 'quantityBreaks',
    });
  }
  return next;
}

function roundingIncrement(product: any): number {
  const meta = metadata(product);
  return money(meta.roundingIncrementMinor || meta.priceRoundingMinor || product?.roundingIncrementMinor) || 1;
}

function roundUpTo(value: number, increment: number) {
  if (!increment || increment <= 1) return Math.round(value);
  return Math.ceil(value / increment) * increment;
}

export function calculateFinalPricing(request: { product: any; selections?: Record<string, unknown>; quantity?: number }): PricingFinalResult {
  const calculation = calculatePricingPreview(request);
  const product = request.product || {};
  const meta = metadata(product);
  const quantity = calculation.quantity || request.quantity || 1;
  const sources = [product, meta, meta.pricing || {}, meta.pricingRules || {}].filter(Boolean);
  const warnings = Array.from(new Set([...calculation.warnings]));
  const adjustments: PricingFinalAdjustment[] = [];

  let currentMinor = Math.max(0, calculation.costBreakdown?.costSubtotalMinor || calculation.subtotalMinor || calculation.totalMinor || 0);
  const costMinor = currentMinor;

  const markupPercent = firstNumber(sources, ['markupPercent', 'defaultMarkupPercent', 'pricingMarkupPercent']);
  if (markupPercent > 0) {
    currentMinor = addAdjustment(adjustments, currentMinor, currentMinor * (markupPercent / 100), {
      key: 'markup-percent',
      label: `Markup ${markupPercent}%`,
      type: 'markup',
      source: 'product pricing rules',
    });
  }

  const marginPercent = firstNumber(sources, ['marginPercent', 'defaultMarginPercent', 'pricingMarginPercent']) || calculation.costBreakdown?.marginPercent || 0;
  if (marginPercent > 0 && marginPercent < 95) {
    const targetSell = Math.round(currentMinor / (1 - marginPercent / 100));
    currentMinor = addAdjustment(adjustments, currentMinor, targetSell - currentMinor, {
      key: 'gross-margin-percent',
      label: `Gross margin ${marginPercent}%`,
      type: 'margin',
      source: 'product pricing rules',
      notes: ['v217 treats margin as gross margin: sell price = cost / (1 - margin).'],
    });
  } else if (marginPercent >= 95) {
    warnings.push('Margin percent is too high to apply safely. Keep margin below 95%.');
  }

  const quantityBreak = findQuantityBreak(product, quantity);
  currentMinor = applyQuantityBreak(currentMinor, quantityBreak, adjustments, quantity);

  const turnaround = turnaroundMultiplier(product, calculation);
  if (turnaround.multiplier !== 1) {
    currentMinor = addAdjustment(adjustments, currentMinor, currentMinor * turnaround.multiplier - currentMinor, {
      key: 'turnaround-multiplier',
      label: `Turnaround multiplier x${turnaround.multiplier}`,
      type: 'turnaround',
      source: turnaround.source,
    });
  }

  const minimumChargeMinor = Math.max(
    calculation.costBreakdown?.minimumChargeMinor || 0,
    firstMoney(sources, ['minimumChargeMinor', 'minChargeMinor', 'minimumOrderMinor', 'pricingMinimumMinor'])
  );
  if (minimumChargeMinor > 0 && currentMinor < minimumChargeMinor) {
    currentMinor = addAdjustment(adjustments, currentMinor, minimumChargeMinor - currentMinor, {
      key: 'minimum-charge',
      label: 'Minimum charge enforcement',
      type: 'minimum',
      source: 'product/pricing minimum',
    });
  }

  const increment = roundingIncrement(product);
  const rounded = roundUpTo(currentMinor, increment);
  if (rounded !== currentMinor) {
    currentMinor = addAdjustment(adjustments, currentMinor, rounded - currentMinor, {
      key: 'rounding',
      label: `Round up to ${increment} minor units`,
      type: 'rounding',
      source: 'roundingIncrementMinor',
    });
  }

  if (costMinor <= 0) warnings.push('No cost base was produced. Add material, print, finish, setup, run, or base price costs before using final pricing commercially.');
  if (!calculation.ready) warnings.push('Pricing calculation is still in preview mode because required product pricing inputs are incomplete.');

  const sellPriceMinor = Math.max(0, Math.round(currentMinor));
  return {
    status: warnings.length ? 'needs-configuration' : 'priced-preview',
    currency: calculation.currency || 'GBP',
    quantity,
    costMinor,
    sellPriceMinor,
    unitPriceMinor: quantity > 0 ? Math.round(sellPriceMinor / quantity) : sellPriceMinor,
    minimumChargeMinor,
    marginPercent,
    markupPercent,
    turnaroundMultiplier: turnaround.multiplier,
    quantityBreak,
    adjustments,
    warnings: Array.from(new Set(warnings)),
    notes: [
      'v217 adds final-pricing application on top of the v215 cost breakdown.',
      'It supports markup, gross margin, quantity break placeholders, turnaround multipliers, minimum charge enforcement, and rounding.',
      'This remains internal-first pricing. VAT, delivery, customer-specific contracts, and full machine scheduling should stay separate layers.',
    ],
    calculation,
  };
}
