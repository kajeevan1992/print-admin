import { NextResponse } from 'next/server';
import { verifyAdminLogin } from '@/core/auth/admin-auth.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!email || !password) return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 });
    const result = await verifyAdminLogin(email, password);
    if (!result.ok || !result.session) return NextResponse.json({ ok: false, error: result.error || 'Login failed.' }, { status: 401 });
    const response = NextResponse.json({ ok: true, session: result.session, redirectTo: result.session.defaultRoute });
    response.cookies.set('print_admin_session', Buffer.from(JSON.stringify(result.session)).toString('base64url'), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Login failed.' }, { status: 500 });
  }
}
