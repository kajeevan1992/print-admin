import { NextResponse } from 'next/server';
import { deleteCollectionPoint, listCollectionPoints, saveCollectionPoint, seedCollectionPoints } from '@/core/locations/collection-points.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listCollectionPoints(request, {
      search: url.searchParams.get('search') || '',
      status: url.searchParams.get('status') || 'all',
      kind: url.searchParams.get('kind') || 'all',
      checkoutOnly: url.searchParams.get('checkoutOnly') === 'true',
      productSlug: url.searchParams.get('productSlug') || '',
    });
    return NextResponse.json({ ok: true, source: 'internal-collection-points', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points', error: error instanceof Error ? error.message : 'Failed to load collection points.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'seed') {
      const items = await seedCollectionPoints(request);
      return NextResponse.json({ ok: true, source: 'internal-collection-points', action: 'seed', data: { items, count: items.length } });
    }
    const item = await saveCollectionPoint(request, body || {});
    return NextResponse.json({ ok: true, source: 'internal-collection-points', data: { item } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points', error: error instanceof Error ? error.message : 'Failed to save collection point.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const id = url.searchParams.get('id') || body.id || body.slug;
    if (!id) return NextResponse.json({ ok: false, source: 'internal-collection-points', error: 'Collection point delete requires id or slug.' }, { status: 400 });
    const data = await deleteCollectionPoint(request, String(id));
    return NextResponse.json({ ok: true, source: 'internal-collection-points', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points', error: error instanceof Error ? error.message : 'Failed to delete collection point.' }, { status: 500 });
  }
}
