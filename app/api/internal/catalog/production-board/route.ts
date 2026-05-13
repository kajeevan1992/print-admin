import { NextResponse } from 'next/server';
import { getProductionBoard, updateProductionBoard } from '@/core/storefront/production-board';

export async function GET(request: Request) {
  try {
    const result = await getProductionBoard(request);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : 'Production board failed.'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await updateProductionBoard(request, body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : 'Production board update failed.'
        }
      },
      { status: 400 }
    );
  }
}
