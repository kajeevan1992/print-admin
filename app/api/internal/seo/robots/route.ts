import { NextResponse } from 'next/server';
import { buildRobotsTxt } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const robots = await buildRobotsTxt(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-robots-preview', data: robots });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-robots-preview', error: error instanceof Error ? error.message : 'Failed to build robots preview.' }, { status: 500 });
  }
}
