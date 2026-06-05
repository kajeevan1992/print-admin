import { NextResponse } from 'next/server';
import { resolveSeoRedirect } from '@/core/seo/seo-redirects.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || url.searchParams.get('pathname') || '/';
    const redirect = await resolveSeoRedirect(request, path, url.searchParams.get('track') !== 'false');
    if (!redirect) return NextResponse.json({ ok: true, source: 'internal-seo-redirect', data: null });
    return NextResponse.json(
      { ok: true, source: 'internal-seo-redirect', data: redirect },
      { headers: { 'X-Robots-Tag': redirect.statusCode === 410 ? 'noindex,nofollow' : 'index,follow' } }
    );
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-redirect', error: error instanceof Error ? error.message : 'Failed to resolve SEO redirect.' }, { status: 500 });
  }
}
