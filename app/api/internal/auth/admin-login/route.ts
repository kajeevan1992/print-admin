import { NextResponse } from 'next/server';
import { verifyAdminLogin } from '@/core/auth/admin-auth.service';
import { createAdminServerSession, setAdminSessionCookie } from '@/core/auth/session-guard.service';
import { recordAdminLoginFailure, recordAdminLoginSuccess } from '@/core/security/security-audit.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!email || !password) return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 });
    const result = await verifyAdminLogin(email, password);
    if (!result.ok || !result.session || !result.dbUser) {
      await recordAdminLoginFailure(email, result.error || 'Login failed.').catch(() => undefined);
      return NextResponse.json({ ok: false, error: result.error || 'Login failed.' }, { status: 401 });
    }
    const serverSession = await createAdminServerSession(result.dbUser);
    await recordAdminLoginSuccess({ email: result.session.email, tenantId: result.dbUser.tenantId, role: result.dbUser.role }).catch(() => undefined);
    const response = NextResponse.json({ ok: true, session: result.session, redirectTo: result.session.defaultRoute });
    setAdminSessionCookie(response, serverSession.token, serverSession.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Login failed.' }, { status: 500 });
  }
}
