import { NextResponse } from 'next/server';
import { dbAuthStatus } from '@/core/auth/admin-auth.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await dbAuthStatus();
    return NextResponse.json({ ok: true, source: 'internal-admin-auth-status', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-admin-auth-status', error: error instanceof Error ? error.message : 'Auth status failed.' }, { status: 500 });
  }
}
