export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listQuotes, saveQuote } from '@/core/operations/quotes.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-quotes-db',
    error: error instanceof Error ? error.message : 'Quotes request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const quotes = await listQuotes(request);
    return NextResponse.json({ ok: true, source: 'internal-quotes-db', data: { quotes, count: quotes.length } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const quote = await saveQuote(request, body);
    return NextResponse.json({ ok: true, source: 'internal-quotes-db', data: { quote } });
  } catch (error) {
    return responseError(error);
  }
}
