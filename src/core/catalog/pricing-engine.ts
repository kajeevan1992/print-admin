import { buildPricingQuoteInputPayload, type PricingQuoteInputPayload } from './pricing-quote-input';
import { estimatePrintProduction, type PrintProductionEstimate } from './print-production-estimator';

export type PricingCalculationRequest = {
  product: any;
  selections?: Record<string, unknown>;
  quantity?: number;
};

export type PricingCalculationLine = {
  groupKey: string;
  groupName: string;
  role: string;
  selectedLabel?: string;
  pricingKey?: string;
  basis: string;
  quantity?: number;
  setupCostMinor: number;
  runCostMinor: number;
  minChargeMinor: number;
  multiplier: number;
  calculatedMinor: number;
  warnings: string[];
};

export type PricingCalculationResult = {
  productId: string;
  productSlug: string;
  productName: string;
  currency: string;
  engineStatus: 'calculated-preview' | 'needs-configuration';
  ready: boolean;
  quantity: number;
  basePriceMinor: number;
  setupTotalMinor: number;
  runTotalMinor: number;
  minChargeMinor: number;
  multiplier: number;
  subtotalMinor: number;
  totalMinor: number;
  lines: PricingCalculationLine[];
  warnings: string[];
  notes: string[];
  quoteInput: PricingQuoteInputPayload;
  productionEstimate: PrintProductionEstimate;
};

function money(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
}

function multiplier(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : 1;
}

function quantityFromInputs(quoteInput: PricingQuoteInputPayload, explicitQuantity?: number) {
  if (Number.isFinite(explicitQuantity) && Number(explicitQuantity) > 0) return Math.round(Number(explicitQuantity));
  const quantityLine = quoteInput.lines.find((line) => line.role === 'quantity' || line.groupKey === 'quantity');
  if (quantityLine?.quantity && quantityLine.quantity > 0) return Math.round(quantityLine.quantity);
  return 1;
}

export function calculatePricingPreview({ product, selections = {}, quantity }: PricingCalculationRequest): PricingCalculationResult {
  const quoteInput = buildPricingQuoteInputPayload(product, selections);
  const qty = quantityFromInputs(quoteInput, quantity);
  const basePriceMinor = money(product?.priceFromMinor);

  const lines: PricingCalculationLine[] = quoteInput.lines.map((line) => {
    const setupCostMinor = money(line.setupCostMinor);
    const runCostMinor = money(line.runCostMinor);
    const minChargeMinor = money(line.minChargeMinor);
    const lineMultiplier = multiplier(line.pricingMultiplier);
    const calculatedMinor = Math.max(minChargeMinor, Math.round((setupCostMinor + runCostMinor * qty) * lineMultiplier));
    return {
      groupKey: line.groupKey,
      groupName: line.groupName,
      role: line.role,
      selectedLabel: line.selectedLabel,
      pricingKey: line.pricingKey,
      basis: line.basis,
      quantity: line.quantity,
      setupCostMinor,
      runCostMinor,
      minChargeMinor,
      multiplier: lineMultiplier,
      calculatedMinor,
      warnings: line.warnings,
    };
  });

  const setupTotalMinor = lines.reduce((sum, line) => sum + line.setupCostMinor, 0);
  const runTotalMinor = lines.reduce((sum, line) => sum + line.runCostMinor * qty, 0);
  const minChargeMinor = Math.max(basePriceMinor, ...lines.map((line) => line.minChargeMinor));
  const totalMultiplier = lines.reduce((acc, line) => acc * line.multiplier, 1);
  const subtotalMinor = Math.round((basePriceMinor + setupTotalMinor + runTotalMinor) * totalMultiplier);
  const totalMinor = Math.max(minChargeMinor, subtotalMinor);

  const productionEstimate = estimatePrintProduction(quoteInput, qty);
  const warnings = [...quoteInput.warnings, ...productionEstimate.warnings.map((message) => `Production estimate: ${message}`)];
  if (!basePriceMinor && !setupTotalMinor && !runTotalMinor) warnings.push('No base price or pricing costs are configured yet. This is a pricing scaffold result only.');
  if (!quoteInput.ready) warnings.push('Product pricing input is not ready. Complete missing pricing roles before using this commercially.');

  return {
    productId: quoteInput.productId,
    productSlug: quoteInput.productSlug,
    productName: quoteInput.productName,
    currency: quoteInput.currency || 'GBP',
    engineStatus: warnings.length ? 'needs-configuration' : 'calculated-preview',
    ready: warnings.length === 0,
    quantity: qty,
    basePriceMinor,
    setupTotalMinor,
    runTotalMinor,
    minChargeMinor,
    multiplier: totalMultiplier,
    subtotalMinor,
    totalMinor,
    lines,
    warnings,
    notes: [
      'This is the v214 pricing/production estimate foundation only.',
      'It calculates from product pricing input fields, but does not yet include SRA sheet imposition, machine speed, labour, VAT, delivery, or margin rules.',
      'Use this endpoint to verify that product options are producing a clean pricing payload before the full print pricing engine is added.',
    ],
    quoteInput,
    productionEstimate,
  };
}
