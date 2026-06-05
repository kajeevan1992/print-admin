import { NextResponse } from 'next/server';
import { deleteSeoRedirect, listSeoRedirects, saveSeoRedirect } from '@/core/seo/seo-redirects.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listSeoRedirects(request, {
      search: url.searchParams.get('search') || '',
      active: url.searchParams.get('active') || 'all',
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-redirects', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-redirects', error: error instanceof Error ? error.message : 'Failed to load SEO redirects.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const item = await saveSeoRedirect(request, body || {});
    return NextResponse.json({ ok: true, source: 'internal-seo-redirects', data: { item } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-redirects', error: error instanceof Error ? error.message : 'Failed to save SEO redirect.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const id = url.searchParams.get('id') || body.id || body.slug || body.fromPath;
    if (!id) return NextResponse.json({ ok: false, source: 'internal-seo-redirects', error: 'Redirect delete requires id, slug or fromPath.' }, { status: 400 });
    const data = await deleteSeoRedirect(request, String(id));
    return NextResponse.json({ ok: true, source: 'internal-seo-redirects', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-redirects', error: error instanceof Error ? error.message : 'Failed to delete SEO redirect.' }, { status: 500 });
  }
}
