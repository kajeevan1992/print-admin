import { NextResponse } from 'next/server';
import { googleOAuthStatus } from '@/core/auth/google-oauth.service';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireSuperAdmin();
    const data = await googleOAuthStatus();
    return NextResponse.json({ ok: true, source: 'internal-auth-google-status', data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Google OAuth status could not load.' }, { status: 500 });
  }
}
