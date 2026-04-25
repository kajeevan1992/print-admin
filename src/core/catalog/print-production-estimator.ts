import type { PricingQuoteInputPayload } from './pricing-quote-input';

export type PrintProductionEstimate = {
  status: 'estimated' | 'needs-configuration';
  productKind: 'sheet' | 'roll' | 'board' | 'unknown';
  quantity: number;
  selectedWidth?: number;
  selectedHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  bleed?: number;
  pages?: number;
  sides?: number;
  upsPerSource?: number;
  sourceUnitsRequired?: number;
  impressions?: number;
  wastePercent?: number;
  warnings: string[];
  notes: string[];
};

function positive(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : undefined;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function firstNumber(lines: PricingQuoteInputPayload['lines'], keys: string[]): number | undefined {
  for (const line of lines) {
    const selected: any = line as any;
    for (const key of keys) {
      const direct = positive(selected[key]);
      if (direct) return direct;
      const fromValue = positive(selected?.rawSelectedValue?.[key]);
      if (fromValue) return fromValue;
      const fromGroup = positive(selected?.rawGroup?.[key]);
      if (fromGroup) return fromGroup;
    }
  }
  return undefined;
}

function selectedSize(lines: PricingQuoteInputPayload['lines']) {
  const sizeLine = lines.find((line) => ['size', 'width-height', 'dimensions'].includes(text(line.role)) || ['size', 'dimensions'].includes(text(line.groupKey)));
  return {
    width: positive((sizeLine as any)?.width) || firstNumber(lines, ['selectedWidth', 'widthMm', 'width']),
    height: positive((sizeLine as any)?.height) || firstNumber(lines, ['selectedHeight', 'heightMm', 'height', 'lengthMm', 'length']),
  };
}

function detectKind(lines: PricingQuoteInputPayload['lines']): PrintProductionEstimate['productKind'] {
  const joined = lines.map((line) => `${line.groupKey} ${line.role} ${line.productionCode || ''} ${(line as any).pricingKey || ''}`).join(' ').toLowerCase();
  if (joined.includes('roll') || joined.includes('banner') || joined.includes('pvc')) return 'roll';
  if (joined.includes('board') || joined.includes('sign')) return 'board';
  if (joined.includes('sheet') || joined.includes('sra') || joined.includes('card') || joined.includes('flyer') || joined.includes('booklet')) return 'sheet';
  return 'unknown';
}

function bestSheetUps(sourceWidth: number, sourceHeight: number, jobWidth: number, jobHeight: number) {
  const portrait = Math.floor(sourceWidth / jobWidth) * Math.floor(sourceHeight / jobHeight);
  const landscape = Math.floor(sourceWidth / jobHeight) * Math.floor(sourceHeight / jobWidth);
  return Math.max(portrait, landscape, 0);
}

export function estimatePrintProduction(quoteInput: PricingQuoteInputPayload, quantity: number): PrintProductionEstimate {
  const lines = quoteInput.lines || [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const kind = detectKind(lines);
  const size = selectedSize(lines);
  const bleed = firstNumber(lines, ['bleedMm', 'bleed']) || 0;
  const pages = firstNumber(lines, ['pages', 'pageCount']) || 1;
  const sides = firstNumber(lines, ['sides', 'sideCount']) || (pages > 1 ? 2 : 1);
  const sourceWidth = firstNumber(lines, ['sourceWidthMm', 'sourceWidth', 'sheetWidthMm', 'rollWidthMm', 'boardWidthMm']);
  const sourceHeight = firstNumber(lines, ['sourceHeightMm', 'sourceHeight', 'sheetHeightMm', 'rollLengthMm', 'boardHeightMm']);

  if (!size.width || !size.height) warnings.push('Selected product size is missing width/height, so production fit cannot be estimated.');

  let upsPerSource: number | undefined;
  let sourceUnitsRequired: number | undefined;
  let impressions: number | undefined;
  let wastePercent: number | undefined;

  if (kind === 'sheet' || kind === 'board') {
    if (!sourceWidth || !sourceHeight) warnings.push('Source sheet/board width and height are missing. Add source dimensions to the size/material setup.');
    if (size.width && size.height && sourceWidth && sourceHeight) {
      const jobWidth = size.width + bleed * 2;
      const jobHeight = size.height + bleed * 2;
      upsPerSource = bestSheetUps(sourceWidth, sourceHeight, jobWidth, jobHeight);
      if (!upsPerSource) warnings.push('Selected size does not fit on the configured source sheet/board.');
      if (upsPerSource > 0) {
        const pageSets = Math.max(1, Math.ceil(pages / Math.max(1, sides)));
        sourceUnitsRequired = Math.ceil((quantity * pageSets) / upsPerSource);
        impressions = sourceUnitsRequired * Math.max(1, sides);
        const usedArea = upsPerSource * jobWidth * jobHeight;
        const sourceArea = sourceWidth * sourceHeight;
        wastePercent = sourceArea > 0 ? Math.max(0, Math.round((1 - usedArea / sourceArea) * 10000) / 100) : undefined;
      }
    }
  } else if (kind === 'roll') {
    const rollWidth = sourceWidth;
    if (!rollWidth) warnings.push('Roll/material printable width is missing. Add max roll/printer width to the product setup.');
    if (rollWidth && size.width && size.width > rollWidth) warnings.push('Selected width is wider than the configured roll/printer width.');
    if (size.width && size.height) {
      sourceUnitsRequired = quantity;
      impressions = quantity;
      notes.push('Roll estimate treats each ordered banner/sign as one produced unit; final roll length and nesting will be added in the full pricing engine.');
    }
  } else {
    warnings.push('Product kind could not be detected as sheet, board, or roll. Add production codes or source dimensions to improve estimates.');
  }

  return {
    status: warnings.length ? 'needs-configuration' : 'estimated',
    productKind: kind,
    quantity,
    selectedWidth: size.width,
    selectedHeight: size.height,
    sourceWidth,
    sourceHeight,
    bleed,
    pages,
    sides,
    upsPerSource,
    sourceUnitsRequired,
    impressions,
    wastePercent,
    warnings,
    notes: [
      'This is a v214 production estimate only, not final commercial pricing.',
      'It prepares sheet/roll/board production numbers for the full pricing engine.',
      ...notes,
    ],
  };
}
