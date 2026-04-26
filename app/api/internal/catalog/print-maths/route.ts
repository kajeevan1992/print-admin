import { NextRequest, NextResponse } from 'next/server';
import { calculatePrintCostEstimate } from '@/core/pricing/print-maths';

export const dynamic = 'force-dynamic';

function numberParam(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function textParam(searchParams: URLSearchParams, key: string, fallback: string): string {
  return searchParams.get(key) || fallback;
}

function parseQuantityTiers(raw: string | null) {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const result = calculatePrintCostEstimate({
    quantity: numberParam(searchParams, 'quantity', 100),
    productWidthMm: numberParam(searchParams, 'productWidthMm', 85),
    productHeightMm: numberParam(searchParams, 'productHeightMm', 55),
    sheetWidthMm: numberParam(searchParams, 'sheetWidthMm', 450),
    sheetHeightMm: numberParam(searchParams, 'sheetHeightMm', 320),
    sides: searchParams.get('sides') === '2' ? 2 : 1,
    wastePercent: numberParam(searchParams, 'wastePercent', 5),
    sheetCostMinor: numberParam(searchParams, 'sheetCostMinor', 0),
    clickCostMinor: numberParam(searchParams, 'clickCostMinor', 0),
    setupCostMinor: numberParam(searchParams, 'setupCostMinor', 0),
    finishingCostMinor: numberParam(searchParams, 'finishingCostMinor', 0),
    makeReadySheets: numberParam(searchParams, 'makeReadySheets', 0),
    laminationCostMinor: numberParam(searchParams, 'laminationCostMinor', 0),
    laminationMode: textParam(searchParams, 'laminationMode', 'none') as any,
    foldingCostMinor: numberParam(searchParams, 'foldingCostMinor', 0),
    foldingMode: textParam(searchParams, 'foldingMode', 'none') as any,
    cuttingCostMinor: numberParam(searchParams, 'cuttingCostMinor', 0),
    cuttingMode: textParam(searchParams, 'cuttingMode', 'none') as any,
    cutCount: numberParam(searchParams, 'cutCount', 1),
    spotUvCostMinor: numberParam(searchParams, 'spotUvCostMinor', 0),
    spotUvMode: textParam(searchParams, 'spotUvMode', 'none') as any,
    packingCostMinor: numberParam(searchParams, 'packingCostMinor', 0),
    packingMode: textParam(searchParams, 'packingMode', 'none') as any,
    currency: searchParams.get('currency') || 'GBP',
    markupPercent: numberParam(searchParams, 'markupPercent', 0),
    marginPercent: numberParam(searchParams, 'marginPercent', 0),
    minimumSellPriceMinor: numberParam(searchParams, 'minimumSellPriceMinor', 0),
    roundingMinor: numberParam(searchParams, 'roundingMinor', 1),
    turnaroundMode: textParam(searchParams, 'turnaroundMode', 'standard') as any,
    turnaroundMultiplierPercent: numberParam(searchParams, 'turnaroundMultiplierPercent', Number.NaN),
    turnaroundFlatFeeMinor: numberParam(searchParams, 'turnaroundFlatFeeMinor', 0),
    discountMode: textParam(searchParams, 'discountMode', 'none') as any,
    discountPercent: numberParam(searchParams, 'discountPercent', 0),
    discountFixedMinor: numberParam(searchParams, 'discountFixedMinor', 0),
    vatRatePercent: numberParam(searchParams, 'vatRatePercent', 20),
    vatInclusive: searchParams.get('vatInclusive') === 'true' || searchParams.get('vatInclusive') === '1',
    productionDays: numberParam(searchParams, 'productionDays', 3),
    deliveryDays: numberParam(searchParams, 'deliveryDays', 1),
    includeWeekends: searchParams.get('includeWeekends') === 'true' || searchParams.get('includeWeekends') === '1',
    quantityTiers: parseQuantityTiers(searchParams.get('quantityTiers')),
  });

  return NextResponse.json({ ok: true, source: 'internal-core', data: result });
}
