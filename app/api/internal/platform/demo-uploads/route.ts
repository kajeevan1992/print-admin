import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function mapDemo(row: any) {
  return {
    id: row.id,
    tenant: row.tenantName,
    assetPack: row.assetPack,
    status: row.status,
    uploadedBy: row.uploadedBy,
    updatedAt: row.updatedLabel || row.updatedAt?.toISOString?.().slice(0, 10) || '',
  };
}

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: true, data: { items: [] } });
  }

  try {
    const rows = await (prisma as any).platformDemoUpload.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ok: true, data: { items: rows.map(mapDemo) } });
  } catch (error) {
    return NextResponse.json({ ok: true, data: { items: [] }, warning: error instanceof Error ? error.message : 'Demo uploads unavailable.' });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const record = await (prisma as any).platformDemoUpload.upsert({
      where: { id: body.id || `demo-${Date.now()}` },
      update: {
        tenantName: body.tenant,
        assetPack: body.assetPack,
        status: body.status || 'draft',
        uploadedBy: body.uploadedBy || 'Owner Ops',
        updatedLabel: body.updatedAt || '',
      },
      create: {
        id: body.id || `demo-${Date.now()}`,
        tenantName: body.tenant,
        assetPack: body.assetPack,
        status: body.status || 'draft',
        uploadedBy: body.uploadedBy || 'Owner Ops',
        updatedLabel: body.updatedAt || '',
      },
    });

    return NextResponse.json({ ok: true, data: mapDemo(record) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Demo upload save failed.' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: { message: 'Demo upload id is required.' } }, { status: 400 });

  try {
    await (prisma as any).platformDemoUpload.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { deletedId: id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Demo upload delete failed.' } }, { status: 500 });
  }
}
