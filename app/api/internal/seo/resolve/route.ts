import { NextResponse } from 'next/server';
import { resolveSeoForPath, seoResponseHeaders } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || url.searchParams.get('pathname') || '/';
    const data = await resolveSeoForPath(request, path);
    return NextResponse.json({ ok: true, source: 'internal-seo-resolve', data }, { headers: seoResponseHeaders(data) });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-resolve', error: error instanceof Error ? error.message : 'Failed to resolve SEO metadata.' }, { status: 500 });
  }
}
