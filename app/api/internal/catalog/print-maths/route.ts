import { NextRequest, NextResponse } from 'next/server';
import { calculateSheetPlan } from '@/core/pricing/print-maths';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const result = calculateSheetPlan({
    quantity: Number(searchParams.get('quantity') || 100),
    productWidthMm: Number(searchParams.get('productWidthMm') || 85),
    productHeightMm: Number(searchParams.get('productHeightMm') || 55),
    sheetWidthMm: Number(searchParams.get('sheetWidthMm') || 450),
    sheetHeightMm: Number(searchParams.get('sheetHeightMm') || 320),
    sides: searchParams.get('sides') === '2' ? 2 : 1,
    wastePercent: Number(searchParams.get('wastePercent') || 5),
  });

  return NextResponse.json({
    ok: true,
    source: 'internal-core',
    data: result,
  });
}
