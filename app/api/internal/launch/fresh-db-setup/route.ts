import { NextResponse } from 'next/server';
import { runFreshAivenDbSetup } from '@/core/launch/fresh-aiven-db-setup.service';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import { disconnectPlatformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireSuperAdmin();
    const data = await runFreshAivenDbSetup('check');
    return NextResponse.json({ ok: true, source: 'internal-launch-fresh-db-setup', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-fresh-db-setup', error: error instanceof Error ? error.message : 'Fresh database setup check failed.' }, { status: 500 });
  } finally {
    await disconnectPlatformPrisma();
  }
}

export async function POST() {
  try {
    await requireSuperAdmin();
    const data = await runFreshAivenDbSetup('apply');
    return NextResponse.json({ ok: true, source: 'internal-launch-fresh-db-setup', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-fresh-db-setup', error: error instanceof Error ? error.message : 'Fresh database setup failed.' }, { status: 500 });
  } finally {
    await disconnectPlatformPrisma();
  }
}
