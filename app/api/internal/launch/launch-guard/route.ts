import { NextResponse } from 'next/server';
import { buildLaunchGuardReport } from '@/core/launch/launch-guard.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await buildLaunchGuardReport();
    return NextResponse.json({ ok: true, source: 'internal-launch-guard', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-guard', error: error instanceof Error ? error.message : 'Launch guard failed.' }, { status: 500 });
  }
}
