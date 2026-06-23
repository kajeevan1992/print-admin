import { NextResponse } from 'next/server';
import { handleGoogleOAuthCallback } from '@/core/auth/google-oauth.service';
import { recordSecurityEvent } from '@/core/security/security-audit.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    return await handleGoogleOAuthCallback(request);
  } catch (error) {
    await recordSecurityEvent({ action: 'auth.google.login_failed', actor: '', severity: 'warning', metadata: { error: error instanceof Error ? error.message : 'Google OAuth failed.' } }).catch(() => undefined);
    const login = new URL('/login', new URL(request.url).origin);
    login.searchParams.set('error', error instanceof Error ? error.message : 'Google login failed.');
    return NextResponse.redirect(login);
  }
}
