export type PrintMathsInput = {
  quantity: number;
  productWidthMm: number;
  productHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  sides?: 1 | 2;
  wastePercent?: number;
};

export type FinishingStackInput = {
  laminationCostMinor?: number;
  laminationMode?: 'none' | 'per_unit' | 'per_sheet' | 'per_side_impression';
  foldingCostMinor?: number;
  foldingMode?: 'none' | 'per_unit' | 'per_sheet';
  cuttingCostMinor?: number;
  cuttingMode?: 'none' | 'per_unit' | 'per_sheet' | 'per_cut';
  cutCount?: number;
  spotUvCostMinor?: number;
  spotUvMode?: 'none' | 'per_unit' | 'per_sheet' | 'per_side_impression';
  packingCostMinor?: number;
  packingMode?: 'none' | 'per_unit' | 'flat';
};

export type TurnaroundPricingInput = {
  turnaroundMode?: 'standard' | 'priority' | 'rush' | 'custom';
  turnaroundMultiplierPercent?: number;
  turnaroundFlatFeeMinor?: number;
  productionDays?: number;
  deliveryDays?: number;
  includeWeekends?: boolean;
};

export type QuantityPriceTier = {
  minQuantity: number;
  markupPercent?: number;
  marginPercent?: number;
  fixedSellPriceMinor?: number;
};

export type PrintCostInput = PrintMathsInput & FinishingStackInput & TurnaroundPricingInput & {
  discountMode?: 'none' | 'percent' | 'fixed';
  discountPercent?: number;
  discountFixedMinor?: number;
  vatRatePercent?: number;
  vatInclusive?: boolean;
  sheetCostMinor?: number;
  clickCostMinor?: number;
  setupCostMinor?: number;
  finishingCostMinor?: number;
  makeReadySheets?: number;
  currency?: string;
  markupPercent?: number;
  marginPercent?: number;
  minimumSellPriceMinor?: number;
  roundingMinor?: number;
  quantityTiers?: QuantityPriceTier[];
};

export type SheetPlanResult = {
  ok: boolean;
  reason?: string;
  orientation?: 'normal' | 'rotated';
  upsPerSheet: number;
  across?: number;
  down?: number;
  baseSheets: number;
  wasteSheets: number;
  makeReadySheets?: number;
  totalSheets: number;
  impressions: number;
  utilisationPercent?: number;
  wasteAreaPercent?: number;
};

export type PrintCostLine = {
  code: string;
  label: string;
  quantity: number;
  unitCostMinor: number;
  totalMinor: number;
};

export type DeliveryEstimate = {
  productionDays: number;
  deliveryDays: number;
  totalDays: number;
  estimatedReadyDate: string;
  estimatedDeliveryDate: string;
  includeWeekends: boolean;
};

export type PrintCostEstimate = SheetPlanResult & {
  discountMode: string;
  discountPercent: number;
  discountFixedMinor: number;
  discountMinor: number;
  netSellPriceMinor: number;
  vatRatePercent: number;
  vatMinor: number;
  grossSellPriceMinor: number;
  vatInclusive: boolean;
  currency: string;
  costLines: PrintCostLine[];
  finishingLines: PrintCostLine[];
  totalCostMinor: number;
  materialCostMinor: number;
  printCostMinor: number;
  setupCostTotalMinor: number;
  finishingCostTotalMinor: number;
  unitCostMinor: number;
  appliedPricingTier?: QuantityPriceTier | null;
  markupPercent: number;
  marginPercent: number;
  minimumSellPriceMinor: number;
  roundingMinor: number;
  sellPriceMinor: number;
  unitSellPriceMinor: number;
  profitMinor: number;
  achievedMarginPercent: number;
  turnaroundMode: string;
  turnaroundMultiplierPercent: number;
  turnaroundFlatFeeMinor: number;
  deliveryEstimate: DeliveryEstimate;
};

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function moneyMinor(value: unknown): number {
  return Math.round(nonNegativeNumber(value, 0));
}

function modeOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function addCostLine(lines: PrintCostLine[], code: string, label: string, quantity: number, unitCostMinor: number) {
  const safeQuantity = Math.max(0, Math.round(nonNegativeNumber(quantity, 0)));
  const safeUnitCost = moneyMinor(unitCostMinor);
  if (safeQuantity <= 0 || safeUnitCost <= 0) return;
  lines.push({ code, label, quantity: safeQuantity, unitCostMinor: safeUnitCost, totalMinor: safeQuantity * safeUnitCost });
}

function finishingQuantity(mode: string, quantity: number, totalSheets: number, impressions: number, cutCount = 1): number {
  switch (mode) {
    case 'per_unit': return quantity;
    case 'per_sheet': return totalSheets;
    case 'per_side_impression': return impressions;
    case 'per_cut': return totalSheets * Math.max(1, Math.round(cutCount));
    case 'flat': return 1;
    default: return 0;
  }
}

function roundUpTo(value: number, roundingMinor: number): number {
  const rounding = Math.max(1, Math.round(nonNegativeNumber(roundingMinor, 1)));
  return Math.ceil(value / rounding) * rounding;
}

function addDays(start: Date, days: number, includeWeekends: boolean): Date {
  const result = new Date(start);
  let remaining = Math.max(0, Math.round(nonNegativeNumber(days, 0)));
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (includeWeekends || (result.getDay() !== 0 && result.getDay() !== 6)) remaining -= 1;
  }
  return result;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateTaxAndDiscount(sellPriceMinor: number, input: PrintCostInput) {
  const discountMode = modeOr(input.discountMode, ['none', 'percent', 'fixed'] as const, 'none');
  const discountPercent = Math.min(100, nonNegativeNumber(input.discountPercent, 0));
  const discountFixedMinor = moneyMinor(input.discountFixedMinor);
  const vatRatePercent = Math.min(100, nonNegativeNumber(input.vatRatePercent, 20));
  const vatInclusive = Boolean(input.vatInclusive);

  let discountMinor = 0;
  if (discountMode === 'percent') discountMinor = Math.round(sellPriceMinor * (discountPercent / 100));
  if (discountMode === 'fixed') discountMinor = Math.min(sellPriceMinor, discountFixedMinor);

  const afterDiscountMinor = Math.max(0, sellPriceMinor - discountMinor);
  let netSellPriceMinor = afterDiscountMinor;
  let vatMinor = Math.round(netSellPriceMinor * (vatRatePercent / 100));
  let grossSellPriceMinor = netSellPriceMinor + vatMinor;

  if (vatInclusive && vatRatePercent > 0) {
    grossSellPriceMinor = afterDiscountMinor;
    netSellPriceMinor = Math.round(grossSellPriceMinor / (1 + vatRatePercent / 100));
    vatMinor = Math.max(0, grossSellPriceMinor - netSellPriceMinor);
  }

  return { discountMode, discountPercent, discountFixedMinor, discountMinor, netSellPriceMinor, vatRatePercent, vatMinor, grossSellPriceMinor, vatInclusive };
}

function calculateDeliveryEstimate(input: PrintCostInput): DeliveryEstimate {
  const productionDays = Math.max(0, Math.round(nonNegativeNumber(input.productionDays, 3)));
  const deliveryDays = Math.max(0, Math.round(nonNegativeNumber(input.deliveryDays, 1)));
  const includeWeekends = Boolean(input.includeWeekends);
  const readyDate = addDays(new Date(), productionDays, includeWeekends);
  const deliveryDate = addDays(readyDate, deliveryDays, includeWeekends);
  return {
    productionDays,
    deliveryDays,
    totalDays: productionDays + deliveryDays,
    estimatedReadyDate: dateOnly(readyDate),
    estimatedDeliveryDate: dateOnly(deliveryDate),
    includeWeekends,
  };
}

function normaliseTiers(tiers?: QuantityPriceTier[]): QuantityPriceTier[] {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .map((tier) => ({
      minQuantity: Math.max(1, Math.round(nonNegativeNumber(tier?.minQuantity, 1))),
      markupPercent: nonNegativeNumber(tier?.markupPercent, 0),
      marginPercent: nonNegativeNumber(tier?.marginPercent, 0),
      fixedSellPriceMinor: tier?.fixedSellPriceMinor === undefined ? undefined : moneyMinor(tier.fixedSellPriceMinor),
    }))
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

function selectPricingTier(quantity: number, tiers?: QuantityPriceTier[]): QuantityPriceTier | null {
  const safeTiers = normaliseTiers(tiers);
  let selected: QuantityPriceTier | null = null;
  for (const tier of safeTiers) if (quantity >= tier.minQuantity) selected = tier;
  return selected;
}

export function calculateSellPriceFromCost(totalCostMinor: number, quantity: number, input: PrintCostInput) {
  const selectedTier = selectPricingTier(quantity, input.quantityTiers);
  const markupPercent = selectedTier?.markupPercent || nonNegativeNumber(input.markupPercent, 0);
  const marginPercent = Math.min(95, selectedTier?.marginPercent || nonNegativeNumber(input.marginPercent, 0));
  const minimumSellPriceMinor = moneyMinor(input.minimumSellPriceMinor);
  const roundingMinor = Math.max(1, moneyMinor(input.roundingMinor || 1));

  let sellPriceMinor = selectedTier?.fixedSellPriceMinor || totalCostMinor;
  if (!selectedTier?.fixedSellPriceMinor) {
    if (markupPercent > 0) sellPriceMinor = totalCostMinor * (1 + markupPercent / 100);
    if (marginPercent > 0) sellPriceMinor = totalCostMinor / (1 - marginPercent / 100);
  }

  sellPriceMinor = Math.max(sellPriceMinor, minimumSellPriceMinor);
  sellPriceMinor = roundUpTo(sellPriceMinor, roundingMinor);
  const unitSellPriceMinor = Math.ceil(sellPriceMinor / Math.max(1, quantity));
  const profitMinor = sellPriceMinor - totalCostMinor;
  const achievedMarginPercent = sellPriceMinor > 0 ? Number(((profitMinor / sellPriceMinor) * 100).toFixed(2)) : 0;

  return { appliedPricingTier: selectedTier, markupPercent, marginPercent, minimumSellPriceMinor, roundingMinor, sellPriceMinor, unitSellPriceMinor, profitMinor, achievedMarginPercent };
}

export function calculateSheetPlan(input: PrintMathsInput): SheetPlanResult {
  const quantity = positiveNumber(input.quantity, 1);
  const productWidth = positiveNumber(input.productWidthMm, 1);
  const productHeight = positiveNumber(input.productHeightMm, 1);
  const sheetWidth = positiveNumber(input.sheetWidthMm, 1);
  const sheetHeight = positiveNumber(input.sheetHeightMm, 1);
  const sides: 1 | 2 = input.sides === 2 ? 2 : 1;
  const wastePercent = Math.max(0, Number(input.wastePercent || 0));

  const normalAcross = Math.floor(sheetWidth / productWidth);
  const normalDown = Math.floor(sheetHeight / productHeight);
  const normalUps = normalAcross * normalDown;
  const rotatedAcross = Math.floor(sheetWidth / productHeight);
  const rotatedDown = Math.floor(sheetHeight / productWidth);
  const rotatedUps = rotatedAcross * rotatedDown;
  const rotatedBetter = rotatedUps > normalUps;
  const upsPerSheet = Math.max(normalUps, rotatedUps);

  if (upsPerSheet <= 0) {
    return { ok: false, reason: 'Product does not fit on selected sheet', upsPerSheet: 0, baseSheets: 0, wasteSheets: 0, totalSheets: 0, impressions: 0 };
  }

  const across = rotatedBetter ? rotatedAcross : normalAcross;
  const down = rotatedBetter ? rotatedDown : normalDown;
  const baseSheets = Math.ceil(quantity / upsPerSheet);
  const wasteSheets = Math.ceil(baseSheets * (wastePercent / 100));
  const totalSheets = baseSheets + wasteSheets;
  const impressions = totalSheets * sides;
  const usedArea = upsPerSheet * productWidth * productHeight;
  const sheetArea = sheetWidth * sheetHeight;
  const utilisationPercent = sheetArea > 0 ? Number(((usedArea / sheetArea) * 100).toFixed(2)) : 0;
  const wasteAreaPercent = Number(Math.max(0, 100 - utilisationPercent).toFixed(2));

  return { ok: true, orientation: rotatedBetter ? 'rotated' : 'normal', upsPerSheet, across, down, baseSheets, wasteSheets, totalSheets, impressions, utilisationPercent, wasteAreaPercent };
}

export function calculatePrintCostEstimate(input: PrintCostInput): PrintCostEstimate {
  const plan = calculateSheetPlan(input);
  const currency = input.currency || 'GBP';
  const quantity = positiveNumber(input.quantity, 1);
  const makeReadySheets = Math.floor(nonNegativeNumber(input.makeReadySheets, 0));
  const deliveryEstimate = calculateDeliveryEstimate(input);

  if (!plan.ok) {
    return { ...plan, makeReadySheets, totalSheets: 0, impressions: 0, currency, discountMode: 'none', discountPercent: 0, discountFixedMinor: 0, discountMinor: 0, netSellPriceMinor: 0, vatRatePercent: nonNegativeNumber(input.vatRatePercent, 20), vatMinor: 0, grossSellPriceMinor: 0, vatInclusive: Boolean(input.vatInclusive), costLines: [], finishingLines: [], totalCostMinor: 0, materialCostMinor: 0, printCostMinor: 0, setupCostTotalMinor: 0, finishingCostTotalMinor: 0, unitCostMinor: 0, appliedPricingTier: null, markupPercent: 0, marginPercent: 0, minimumSellPriceMinor: 0, roundingMinor: 1, sellPriceMinor: 0, unitSellPriceMinor: 0, profitMinor: 0, achievedMarginPercent: 0, turnaroundMode: input.turnaroundMode || 'standard', turnaroundMultiplierPercent: 0, turnaroundFlatFeeMinor: 0, deliveryEstimate };
  }

  const totalSheets = plan.totalSheets + makeReadySheets;
  const impressions = totalSheets * (input.sides === 2 ? 2 : 1);
  const sheetCostMinor = moneyMinor(input.sheetCostMinor);
  const clickCostMinor = moneyMinor(input.clickCostMinor);
  const setupCostMinor = moneyMinor(input.setupCostMinor);
  const legacyFinishingCostMinor = moneyMinor(input.finishingCostMinor);
  const costLines: PrintCostLine[] = [];
  const finishingLines: PrintCostLine[] = [];

  addCostLine(costLines, 'material_sheets', 'Material / sheets', totalSheets, sheetCostMinor);
  addCostLine(costLines, 'print_clicks', 'Print clicks / impressions', impressions, clickCostMinor);
  addCostLine(costLines, 'setup', 'Setup / make-ready charge', 1, setupCostMinor);
  if (legacyFinishingCostMinor > 0) addCostLine(finishingLines, 'finishing_legacy', 'General finishing charge', quantity, legacyFinishingCostMinor);

  const laminationMode = modeOr(input.laminationMode, ['none', 'per_unit', 'per_sheet', 'per_side_impression'] as const, 'none');
  const foldingMode = modeOr(input.foldingMode, ['none', 'per_unit', 'per_sheet'] as const, 'none');
  const cuttingMode = modeOr(input.cuttingMode, ['none', 'per_unit', 'per_sheet', 'per_cut'] as const, 'none');
  const spotUvMode = modeOr(input.spotUvMode, ['none', 'per_unit', 'per_sheet', 'per_side_impression'] as const, 'none');
  const packingMode = modeOr(input.packingMode, ['none', 'per_unit', 'flat'] as const, 'none');
  const cutCount = Math.max(1, Math.round(nonNegativeNumber(input.cutCount, 1)));

  addCostLine(finishingLines, 'lamination', `Lamination (${laminationMode})`, finishingQuantity(laminationMode, quantity, totalSheets, impressions), input.laminationCostMinor || 0);
  addCostLine(finishingLines, 'folding', `Folding (${foldingMode})`, finishingQuantity(foldingMode, quantity, totalSheets, impressions), input.foldingCostMinor || 0);
  addCostLine(finishingLines, 'cutting', `Cutting (${cuttingMode})`, finishingQuantity(cuttingMode, quantity, totalSheets, impressions, cutCount), input.cuttingCostMinor || 0);
  addCostLine(finishingLines, 'spot_uv', `Spot UV (${spotUvMode})`, finishingQuantity(spotUvMode, quantity, totalSheets, impressions), input.spotUvCostMinor || 0);
  addCostLine(finishingLines, 'packing', `Packing (${packingMode})`, finishingQuantity(packingMode, quantity, totalSheets, impressions), input.packingCostMinor || 0);

  const subtotalBeforeTurnaround = [...costLines, ...finishingLines].reduce((sum, line) => sum + line.totalMinor, 0);
  const turnaroundMode = modeOr(input.turnaroundMode, ['standard', 'priority', 'rush', 'custom'] as const, 'standard');
  const defaultTurnaroundMultiplier = turnaroundMode === 'priority' ? 15 : turnaroundMode === 'rush' ? 35 : 0;
  const turnaroundMultiplierPercent = nonNegativeNumber(input.turnaroundMultiplierPercent, defaultTurnaroundMultiplier);
  const turnaroundFlatFeeMinor = moneyMinor(input.turnaroundFlatFeeMinor);
  if (turnaroundMultiplierPercent > 0) addCostLine(costLines, `turnaround_${turnaroundMode}_multiplier`, `Turnaround ${turnaroundMode} multiplier`, 1, Math.ceil(subtotalBeforeTurnaround * (turnaroundMultiplierPercent / 100)));
  if (turnaroundFlatFeeMinor > 0) addCostLine(costLines, `turnaround_${turnaroundMode}_flat`, `Turnaround ${turnaroundMode} flat fee`, 1, turnaroundFlatFeeMinor);

  const materialCostMinor = costLines.filter((line) => line.code === 'material_sheets').reduce((sum, line) => sum + line.totalMinor, 0);
  const printCostMinor = costLines.filter((line) => line.code === 'print_clicks').reduce((sum, line) => sum + line.totalMinor, 0);
  const setupCostTotalMinor = costLines.filter((line) => line.code === 'setup').reduce((sum, line) => sum + line.totalMinor, 0);
  const finishingCostTotalMinor = finishingLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const allLines = [...costLines, ...finishingLines];
  const totalCostMinor = allLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const unitCostMinor = Math.ceil(totalCostMinor / quantity);
  const pricing = calculateSellPriceFromCost(totalCostMinor, quantity, input);
  const taxAndDiscount = calculateTaxAndDiscount(pricing.sellPriceMinor, input);

  return { ...plan, makeReadySheets, totalSheets, impressions, currency, costLines: allLines, finishingLines, totalCostMinor, materialCostMinor, printCostMinor, setupCostTotalMinor, finishingCostTotalMinor, unitCostMinor, ...pricing, ...taxAndDiscount, turnaroundMode, turnaroundMultiplierPercent, turnaroundFlatFeeMinor, deliveryEstimate };
}
