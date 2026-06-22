import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdminSession } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireAdminSession();
    return NextResponse.json({ ok: true, source: 'internal-auth-session', session });
  } catch (error) {
    return authErrorResponse(error instanceof Error ? error.message : 'Admin session required.');
  }
}
