import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, requireAdminSession, revokeCurrentAdminSession } from '@/core/auth/session-guard.service';
import { recordAdminLogout } from '@/core/security/security-audit.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await requireAdminSession().catch(() => null);
  if (session) await recordAdminLogout({ email: session.email, tenantId: session.tenantId }).catch(() => undefined);
  await revokeCurrentAdminSession().catch(() => undefined);
  const response = NextResponse.json({ ok: true, source: 'internal-auth-logout' });
  clearAdminSessionCookie(response);
  return response;
}
