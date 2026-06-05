import { NextResponse } from 'next/server';
import { buildLlmsTxt } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildLlmsTxt(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-llms-preview', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-llms-preview', error: error instanceof Error ? error.message : 'Failed to build llms.txt preview.' }, { status: 500 });
  }
}
