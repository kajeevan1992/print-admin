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
  });

  return NextResponse.json({
    ok: true,
    source: 'internal-core',
    data: result,
  });
}
