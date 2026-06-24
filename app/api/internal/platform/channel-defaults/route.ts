import { NextResponse } from 'next/server';
import { bootstrapDefaultStores } from '@/core/platform/store-bootstrap.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await bootstrapDefaultStores();
    return NextResponse.json({ ok: true, source: 'tenant-channel-defaults', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'tenant-channel-defaults', error: error instanceof Error ? error.message : 'Tenant channel defaults failed.' }, { status: 400 });
  }
}

export async function POST() {
  return GET();
}
