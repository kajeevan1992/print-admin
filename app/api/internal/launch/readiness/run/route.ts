import { NextResponse } from 'next/server';
import { runLaunchReadinessRunner } from '@/core/launch/launch-readiness-runner.service';

export const dynamic = 'force-dynamic';

function optionsFrom(request: Request, body: Record<string, any> = {}) {
  const url = new URL(request.url);
  return {
    productSlug: String(body.productSlug || url.searchParams.get('productSlug') || 'business-cards'),
    locationSlug: String(body.locationSlug || url.searchParams.get('locationSlug') || 'sidcup'),
  };
}

export async function GET(request: Request) {
  try {
    const data = await runLaunchReadinessRunner(request, optionsFrom(request));
    return NextResponse.json({ ok: true, source: 'internal-launch-readiness-runner', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-readiness-runner', error: error instanceof Error ? error.message : 'Launch readiness runner failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await runLaunchReadinessRunner(request, optionsFrom(request, body));
    return NextResponse.json({ ok: true, source: 'internal-launch-readiness-runner', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-readiness-runner', error: error instanceof Error ? error.message : 'Launch readiness runner failed.' }, { status: 500 });
  }
}
