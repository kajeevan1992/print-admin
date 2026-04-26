export type PrintMathsInput = {
  quantity: number;
  productWidthMm: number;
  productHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  sides?: 1 | 2;
  wastePercent?: number;
};

export type PrintCostInput = PrintMathsInput & {
  sheetCostMinor?: number;
  clickCostMinor?: number;
  setupCostMinor?: number;
  finishingCostMinor?: number;
  makeReadySheets?: number;
  currency?: string;
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

export type PrintCostEstimate = SheetPlanResult & {
  currency: string;
  costLines: PrintCostLine[];
  totalCostMinor: number;
  unitCostMinor: number;
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
    return {
      ok: false,
      reason: 'Product does not fit on selected sheet',
      upsPerSheet: 0,
      baseSheets: 0,
      wasteSheets: 0,
      totalSheets: 0,
      impressions: 0,
    };
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

  return {
    ok: true,
    orientation: rotatedBetter ? 'rotated' : 'normal',
    upsPerSheet,
    across,
    down,
    baseSheets,
    wasteSheets,
    totalSheets,
    impressions,
    utilisationPercent,
    wasteAreaPercent,
  };
}

export function calculatePrintCostEstimate(input: PrintCostInput): PrintCostEstimate {
  const plan = calculateSheetPlan(input);
  const currency = input.currency || 'GBP';
  const quantity = positiveNumber(input.quantity, 1);
  const makeReadySheets = Math.floor(nonNegativeNumber(input.makeReadySheets, 0));

  if (!plan.ok) {
    return {
      ...plan,
      makeReadySheets,
      totalSheets: 0,
      impressions: 0,
      currency,
      costLines: [],
      totalCostMinor: 0,
      unitCostMinor: 0,
    };
  }

  const totalSheets = plan.totalSheets + makeReadySheets;
  const impressions = totalSheets * (input.sides === 2 ? 2 : 1);
  const sheetCostMinor = moneyMinor(input.sheetCostMinor);
  const clickCostMinor = moneyMinor(input.clickCostMinor);
  const setupCostMinor = moneyMinor(input.setupCostMinor);
  const finishingCostMinor = moneyMinor(input.finishingCostMinor);

  const costLines: PrintCostLine[] = [];

  if (sheetCostMinor > 0) {
    costLines.push({
      code: 'material_sheets',
      label: 'Material / sheets',
      quantity: totalSheets,
      unitCostMinor: sheetCostMinor,
      totalMinor: totalSheets * sheetCostMinor,
    });
  }

  if (clickCostMinor > 0) {
    costLines.push({
      code: 'print_clicks',
      label: 'Print clicks / impressions',
      quantity: impressions,
      unitCostMinor: clickCostMinor,
      totalMinor: impressions * clickCostMinor,
    });
  }

  if (setupCostMinor > 0) {
    costLines.push({
      code: 'setup',
      label: 'Setup / make-ready charge',
      quantity: 1,
      unitCostMinor: setupCostMinor,
      totalMinor: setupCostMinor,
    });
  }

  if (finishingCostMinor > 0) {
    costLines.push({
      code: 'finishing',
      label: 'Finishing charge',
      quantity,
      unitCostMinor: finishingCostMinor,
      totalMinor: quantity * finishingCostMinor,
    });
  }

  const totalCostMinor = costLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const unitCostMinor = Math.ceil(totalCostMinor / quantity);

  return {
    ...plan,
    makeReadySheets,
    totalSheets,
    impressions,
    currency,
    costLines,
    totalCostMinor,
    unitCostMinor,
  };
}
