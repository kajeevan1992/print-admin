import { NextResponse } from 'next/server';
import { getCurrentTenantStoreAllowance, getStoreAllowanceForTenant, listStoreAllowances, saveStoreAllowance } from '@/core/platform/store-allowance.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') || '';
    const data = tenantId === 'current' ? await getCurrentTenantStoreAllowance() : tenantId ? await getStoreAllowanceForTenant(tenantId) : await listStoreAllowances();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store allowance could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveStoreAllowance(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store allowance could not be saved.' }, { status: 400 });
  }
}
