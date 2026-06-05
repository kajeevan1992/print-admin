import { NextResponse } from 'next/server';
import { generateSeoPagesFromTemplates, listSeoTemplates, previewSeoTemplate, seedSeoTemplates, type SeoTemplateKey } from '@/core/seo/seo-template-engine.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'list';
    if (action === 'preview') {
      const key = (url.searchParams.get('key') || 'product-location') as SeoTemplateKey;
      const preview = await previewSeoTemplate(request, key);
      return NextResponse.json({ ok: true, source: 'internal-seo-templates', action, data: { preview } });
    }
    const data = await listSeoTemplates(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-templates', action, data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-templates', error: error instanceof Error ? error.message : 'Failed to load SEO templates.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'generate');
    if (action === 'seed') {
      const templates = await seedSeoTemplates(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-templates', action, data: { templates, count: templates.length } });
    }
    if (action === 'preview') {
      const preview = await previewSeoTemplate(request, (body.key || 'product-location') as SeoTemplateKey);
      return NextResponse.json({ ok: true, source: 'internal-seo-templates', action, data: { preview } });
    }
    const data = await generateSeoPagesFromTemplates(request, {
      publish: Boolean(body.publish),
      productLimit: Number(body.productLimit || 8),
      locationLimit: Number(body.locationLimit || 6),
      keys: Array.isArray(body.keys) ? body.keys : undefined,
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-templates', action: 'generate', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-templates', error: error instanceof Error ? error.message : 'Failed to run SEO template action.' }, { status: 500 });
  }
}
