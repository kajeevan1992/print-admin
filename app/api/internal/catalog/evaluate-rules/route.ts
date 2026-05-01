import { NextResponse } from 'next/server';
import { evaluateProductRules } from '@/core/storefront/option-rules-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await evaluateProductRules(request, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Rule evaluation failed.' } }, { status: 400 });
  }
}
