import { NextResponse } from 'next/server';
import { listWebsiteOwnerSetup, setWebsiteOwnerStatus, upsertWebsiteOwner } from '@/core/platform/website-owner-setup.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listWebsiteOwnerSetup();
    return NextResponse.json({ ok: true, source: 'internal-platform-shop-owner', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-platform-shop-owner', error: error instanceof Error ? error.message : 'Shop owner setup check failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = body?.action === 'status' ? await setWebsiteOwnerStatus(String(body.email || ''), Boolean(body.isActive)) : await upsertWebsiteOwner(body);
    return NextResponse.json({ ok: true, source: 'internal-platform-shop-owner', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-platform-shop-owner', error: error instanceof Error ? error.message : 'Shop owner setup failed.' }, { status: 400 });
  }
}
