import { NextResponse } from 'next/server';
import { listCollectionPasses } from '@/core/collection/collection-handover.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listCollectionPasses(request, { status: url.searchParams.get('status') || 'all', search: url.searchParams.get('search') || '' });
    return NextResponse.json({ ok: true, source: 'internal-collection-passes', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-passes', error: error instanceof Error ? error.message : 'Failed to load collection passes.' }, { status: 500 });
  }
}
