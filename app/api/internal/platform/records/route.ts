import { NextResponse } from 'next/server';
import { deletePlatformRecord, listPlatformRecords, savePlatformRecord } from '@/core/platform/platform-records.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource') || '';
    const search = url.searchParams.get('search') || '';
    const data = await listPlatformRecords(resource, search);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Platform records could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resource = String(body.resource || '');
    const record = body.record || {};
    const data = await savePlatformRecord(resource, record);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Platform record could not be saved.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource') || '';
    const id = url.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ ok: false, error: 'Record id is required.' }, { status: 400 });
    const data = await deletePlatformRecord(resource, id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Platform record could not be deleted.' }, { status: 400 });
  }
}
