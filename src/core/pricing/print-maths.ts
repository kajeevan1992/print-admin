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

export type PrintCostInput = PrintMathsInput & FinishingStackInput & {
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
  finishingLines: PrintCostLine[];
  totalCostMinor: number;
  materialCostMinor: number;
  printCostMinor: number;
  setupCostTotalMinor: number;
  finishingCostTotalMinor: number;
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

function modeOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function addCostLine(lines: PrintCostLine[], code: string, label: string, quantity: number, unitCostMinor: number) {
  const safeQuantity = Math.max(0, Math.round(nonNegativeNumber(quantity, 0)));
  const safeUnitCost = moneyMinor(unitCostMinor);
  if (safeQuantity <= 0 || safeUnitCost <= 0) return;
  lines.push({
    code,
    label,
    quantity: safeQuantity,
    unitCostMinor: safeUnitCost,
    totalMinor: safeQuantity * safeUnitCost,
  });
}

function finishingQuantity(
  mode: string,
  quantity: number,
  totalSheets: number,
  impressions: number,
  cutCount = 1,
): number {
  switch (mode) {
    case 'per_unit':
      return quantity;
    case 'per_sheet':
      return totalSheets;
    case 'per_side_impression':
      return impressions;
    case 'per_cut':
      return totalSheets * Math.max(1, Math.round(cutCount));
    case 'flat':
      return 1;
    default:
      return 0;
  }
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
      finishingLines: [],
      totalCostMinor: 0,
      materialCostMinor: 0,
      printCostMinor: 0,
      setupCostTotalMinor: 0,
      finishingCostTotalMinor: 0,
      unitCostMinor: 0,
    };
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

  if (legacyFinishingCostMinor > 0) {
    addCostLine(finishingLines, 'finishing_legacy', 'General finishing charge', quantity, legacyFinishingCostMinor);
  }

  const laminationMode = modeOr(input.laminationMode, ['none', 'per_unit', 'per_sheet', 'per_side_impression'] as const, 'none');
  const foldingMode = modeOr(input.foldingMode, ['none', 'per_unit', 'per_sheet'] as const, 'none');
  const cuttingMode = modeOr(input.cuttingMode, ['none', 'per_unit', 'per_sheet', 'per_cut'] as const, 'none');
  const spotUvMode = modeOr(input.spotUvMode, ['none', 'per_unit', 'per_sheet', 'per_side_impression'] as const, 'none');
  const packingMode = modeOr(input.packingMode, ['none', 'per_unit', 'flat'] as const, 'none');
  const cutCount = Math.max(1, Math.round(nonNegativeNumber(input.cutCount, 1)));

  addCostLine(
    finishingLines,
    'lamination',
    `Lamination (${laminationMode})`,
    finishingQuantity(laminationMode, quantity, totalSheets, impressions),
    input.laminationCostMinor || 0,
  );
  addCostLine(
    finishingLines,
    'folding',
    `Folding (${foldingMode})`,
    finishingQuantity(foldingMode, quantity, totalSheets, impressions),
    input.foldingCostMinor || 0,
  );
  addCostLine(
    finishingLines,
    'cutting',
    `Cutting (${cuttingMode})`,
    finishingQuantity(cuttingMode, quantity, totalSheets, impressions, cutCount),
    input.cuttingCostMinor || 0,
  );
  addCostLine(
    finishingLines,
    'spot_uv',
    `Spot UV (${spotUvMode})`,
    finishingQuantity(spotUvMode, quantity, totalSheets, impressions),
    input.spotUvCostMinor || 0,
  );
  addCostLine(
    finishingLines,
    'packing',
    `Packing (${packingMode})`,
    finishingQuantity(packingMode, quantity, totalSheets, impressions),
    input.packingCostMinor || 0,
  );

  const materialCostMinor = costLines
    .filter((line) => line.code === 'material_sheets')
    .reduce((sum, line) => sum + line.totalMinor, 0);
  const printCostMinor = costLines
    .filter((line) => line.code === 'print_clicks')
    .reduce((sum, line) => sum + line.totalMinor, 0);
  const setupCostTotalMinor = costLines
    .filter((line) => line.code === 'setup')
    .reduce((sum, line) => sum + line.totalMinor, 0);
  const finishingCostTotalMinor = finishingLines.reduce((sum, line) => sum + line.totalMinor, 0);

  const allLines = [...costLines, ...finishingLines];
  const totalCostMinor = allLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const unitCostMinor = Math.ceil(totalCostMinor / quantity);

  return {
    ...plan,
    makeReadySheets,
    totalSheets,
    impressions,
    currency,
    costLines: allLines,
    finishingLines,
    totalCostMinor,
    materialCostMinor,
    printCostMinor,
    setupCostTotalMinor,
    finishingCostTotalMinor,
    unitCostMinor,
  };
}
