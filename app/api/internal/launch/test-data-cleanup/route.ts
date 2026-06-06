import { NextResponse } from 'next/server';
import { previewLaunchTestDataCleanup, runLaunchTestDataCleanup } from '@/core/launch/launch-test-data-cleanup.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await previewLaunchTestDataCleanup(request);
    return NextResponse.json({ ok: true, source: 'internal-launch-test-data-cleanup', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-test-data-cleanup', error: error instanceof Error ? error.message : 'Cleanup preview failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await runLaunchTestDataCleanup(request, {
      confirm: body.confirm,
      includeOrders: body.includeOrders !== false,
      includePasses: body.includePasses !== false,
      includeEmails: body.includeEmails !== false,
    });
    return NextResponse.json({ ok: data.ok, source: 'internal-launch-test-data-cleanup', data, error: data.ok ? undefined : data.reason }, { status: data.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-test-data-cleanup', error: error instanceof Error ? error.message : 'Cleanup failed.' }, { status: 500 });
  }
}
