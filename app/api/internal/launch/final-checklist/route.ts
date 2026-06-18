import { NextResponse } from 'next/server';
import { buildFinalLaunchChecklist } from '@/core/launch/final-launch-checklist.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const data = await buildFinalLaunchChecklist(request);
    return NextResponse.json({ ok: true, source: 'internal-launch-final-checklist', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-final-checklist', error: error instanceof Error ? error.message : 'Final launch checklist failed.' }, { status: 500 });
  }
}
