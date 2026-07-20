import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function retired() {
  await requireTenantSession();
  return NextResponse.json({ ok: false, error: 'This duplicate editor has been retired. Use Storefront Builder at /themes and /api/internal/storefront-themes.', redirectUrl: '/themes' }, { status: 410 });
}

export async function GET() {
  try { return await retired(); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Admin session required.' }, { status: 401 }); }
}

export async function POST() {
  try { return await retired(); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Admin session required.' }, { status: 401 }); }
}
