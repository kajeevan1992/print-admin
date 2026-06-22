import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, revokeCurrentAdminSession } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  await revokeCurrentAdminSession().catch(() => undefined);
  const response = NextResponse.json({ ok: true, source: 'internal-auth-logout' });
  clearAdminSessionCookie(response);
  return response;
}
