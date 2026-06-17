import { NextResponse } from 'next/server';
import { buildBackupRecoveryReadiness } from '@/core/launch/backup-recovery-readiness.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildBackupRecoveryReadiness();
  return NextResponse.json({ ok: true, source: 'internal-launch-storage-check', data });
}
