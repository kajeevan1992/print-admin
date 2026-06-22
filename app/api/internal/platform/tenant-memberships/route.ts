import { NextResponse } from 'next/server';
import { listTenantMemberships, removeTenantMembership, upsertTenantMembership } from '@/core/platform/tenant-memberships.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listTenantMemberships();
    return NextResponse.json({ ok: true, source: 'internal-platform-tenant-memberships', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-platform-tenant-memberships', error: error instanceof Error ? error.message : 'Tenant memberships could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await upsertTenantMembership(body);
    return NextResponse.json({ ok: true, source: 'internal-platform-tenant-memberships', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-platform-tenant-memberships', error: error instanceof Error ? error.message : 'Tenant membership could not be saved.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ ok: false, error: 'Membership id is required.' }, { status: 400 });
    const data = await removeTenantMembership(id);
    return NextResponse.json({ ok: true, source: 'internal-platform-tenant-memberships', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-platform-tenant-memberships', error: error instanceof Error ? error.message : 'Tenant membership could not be deleted.' }, { status: 400 });
  }
}
