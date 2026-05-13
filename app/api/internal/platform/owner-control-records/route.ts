import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource');

  try {
    const rows = await (prisma as any).ownerControlRecord.findMany({
      where: resource ? { resource } : undefined,
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ ok: true, data: { items: rows } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Owner records unavailable.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const record = await (prisma as any).ownerControlRecord.upsert({
      where: {
        resource_recordId: {
          resource: body.resource,
          recordId: body.recordId || body.id,
        }
      },
      update: {
        title: body.title,
        status: body.status || 'active',
        scope: body.scope || null,
        tenantId: body.tenantId || null,
        metadataJson: body.metadataJson || {},
      },
      create: {
        id: body.id,
        resource: body.resource,
        recordId: body.recordId || body.id,
        title: body.title,
        status: body.status || 'active',
        scope: body.scope || null,
        tenantId: body.tenantId || null,
        metadataJson: body.metadataJson || {},
      }
    });

    return NextResponse.json({ ok: true, data: record });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Owner record save failed.' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: 'Missing id.' } }, { status: 400 });
  }

  try {
    await (prisma as any).ownerControlRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Delete failed.' } }, { status: 500 });
  }
}
