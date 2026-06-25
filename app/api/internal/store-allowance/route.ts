import { NextResponse } from 'next/server';
import { getCurrentTenantStoreAllowance } from '@/core/platform/store-allowance.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getCurrentTenantStoreAllowance();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store allowance could not load.' }, { status: 500 });
  }
}
