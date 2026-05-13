export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/core/operations/quotes.service';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const quote = await getQuote(request, context.params.id);

    if (!quote) {
      return NextResponse.json({ ok: false, error: 'Quote not found.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      source: 'internal-quotes-db',
      data: { quote },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Quote request failed.',
    }, { status: 500 });
  }
}
