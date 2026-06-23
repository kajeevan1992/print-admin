import { NextResponse } from 'next/server';
import { createGoogleOAuthUrl } from '@/core/auth/google-oauth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = await createGoogleOAuthUrl(request);
    return NextResponse.redirect(url);
  } catch (error) {
    const login = new URL('/login', new URL(request.url).origin);
    login.searchParams.set('error', error instanceof Error ? error.message : 'Google login is unavailable.');
    return NextResponse.redirect(login);
  }
}
