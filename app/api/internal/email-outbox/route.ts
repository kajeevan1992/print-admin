import { NextResponse } from 'next/server';
import { listEmailOutbox } from '@/core/storefront/internal-artwork-reupload';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await listEmailOutbox();
  return NextResponse.json({ ok: true, source: 'internal-email-outbox', data: { items, count: items.length } });
}
