import { NextResponse } from 'next/server';
import { defaultLocalSeoGeneratorInput, generateLocalSeoPages, previewLocalSeoPages } from '@/core/seo/local-seo-generator.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = defaultLocalSeoGeneratorInput();
    const mode = url.searchParams.get('mode');
    const maxPages = Number(url.searchParams.get('maxPages') || input.maxPages);
    const status = url.searchParams.get('status') as 'draft' | 'published' | 'hidden' | null;
    const includeInSitemap = url.searchParams.get('includeInSitemap') === 'true';
    const data = previewLocalSeoPages({
      ...input,
      mode: mode === 'product-location' || mode === 'service-area' || mode === 'collection-points' || mode === 'all' ? mode : input.mode,
      status: status === 'draft' || status === 'published' || status === 'hidden' ? status : input.status,
      includeInSitemap,
      maxPages,
    });
    return NextResponse.json({ ok: true, source: 'internal-local-seo-generator', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-local-seo-generator', error: error instanceof Error ? error.message : 'Failed to preview local SEO pages.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'preview');
    const input = body.input || body || {};
    const data = action === 'generate' ? await generateLocalSeoPages(request, input) : previewLocalSeoPages(input);
    return NextResponse.json({ ok: true, source: 'internal-local-seo-generator', action, data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-local-seo-generator', error: error instanceof Error ? error.message : 'Failed to generate local SEO pages.' }, { status: 500 });
  }
}
