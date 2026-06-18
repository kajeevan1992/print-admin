import { NextResponse } from 'next/server';
import { buildButtonAudit } from '@/core/launch/button-audit.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await buildButtonAudit();
    return NextResponse.json({ ok: true, source: 'internal-launch-button-audit', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-button-audit', error: error instanceof Error ? error.message : 'Button audit failed.' }, { status: 500 });
  }
}
