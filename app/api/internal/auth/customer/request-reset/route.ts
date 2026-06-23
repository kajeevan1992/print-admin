import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/core/auth/customer-auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await requestPasswordReset(body);
    return NextResponse.json({ ok: true, source: 'internal-auth-customer-request-reset', data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Reset request failed.' }, { status: 400 });
  }
}
