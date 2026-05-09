import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function mapDeployment(row: any) {
  return {
    id: row.id,
    tenant: row.tenantName,
    environment: row.environment,
    status: row.status,
    owner: row.owner,
    scheduledFor: row.scheduledFor || '',
    note: row.note || '',
  };
}

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: true, data: { items: [] } });
  }

  try {
    const rows = await (prisma as any).platformDeployment.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ok: true, data: { items: rows.map(mapDeployment) } });
  } catch (error) {
    return NextResponse.json({ ok: true, data: { items: [] }, warning: error instanceof Error ? error.message : 'Deployments unavailable.' });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const record = await (prisma as any).platformDeployment.upsert({
      where: { id: body.id || `dep-${Date.now()}` },
      update: {
        tenantName: body.tenant,
        environment: body.environment || 'production',
        status: body.status || 'queued',
        owner: body.owner || 'Owner Ops',
        scheduledFor: body.scheduledFor || '',
        note: body.note || '',
      },
      create: {
        id: body.id || `dep-${Date.now()}`,
        tenantName: body.tenant,
        environment: body.environment || 'production',
        status: body.status || 'queued',
        owner: body.owner || 'Owner Ops',
        scheduledFor: body.scheduledFor || '',
        note: body.note || '',
      },
    });

    return NextResponse.json({ ok: true, data: mapDeployment(record) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment save failed.' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: { message: 'Deployment id is required.' } }, { status: 400 });

  try {
    await (prisma as any).platformDeployment.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { deletedId: id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment delete failed.' } }, { status: 500 });
  }
}
