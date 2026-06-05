import { NextResponse } from 'next/server';
import { buildSitemapXml } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const sitemap = await buildSitemapXml(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-sitemap-preview', data: sitemap });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-sitemap-preview', error: error instanceof Error ? error.message : 'Failed to build sitemap preview.' }, { status: 500 });
  }
}
