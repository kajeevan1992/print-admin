import { NextResponse } from 'next/server';
import { dbAuthStatus } from '@/core/auth/admin-auth.service';
import { getRuntimeDatabaseInfo } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const database = getRuntimeDatabaseInfo();
  try {
    const data = await dbAuthStatus();
    return NextResponse.json({ ok: true, source: 'internal-admin-auth-status', data: { ...data, database } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-admin-auth-status', database, error: error instanceof Error ? error.message : 'Auth status failed.' }, { status: 500 });
  }
}
