import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const OWNER_CONTROL_RESOURCES = new Set([
  'owner-api-keys',
  'owner-feature-flags',
  'owner-webhooks',
  'owner-notifications',
  'owner-environments',
  'owner-billing-plans',
  'owner-compliance-controls',
  'owner-usage-limits',
  'owner-backups',
  'owner-sso-configs',
  'owner-domains',
  'owner-incidents',
  'owner-maintenance-windows',
]);

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function error(message: string, status = 400) {
  return json({ ok: false, error: { message } }, { status });
}

function parseResources(url: URL) {
  const single = url.searchParams.get('resource');
  const many = url.searchParams.get('resources');
  const values = [single, ...(many ? many.split(',') : [])].filter(Boolean).map((value) => String(value).trim());
  const unique = [...new Set(values)];
  const invalid = unique.filter((value) => !OWNER_CONTROL_RESOURCES.has(value));
  if (invalid.length) throw new Error(`Unsupported owner control resource: ${invalid.join(', ')}`);
  return unique;
}

function normaliseBody(body: any) {
  const resource = String(body.resource || '').trim();
  const recordId = String(body.recordId || body.id || '').trim();
  if (!OWNER_CONTROL_RESOURCES.has(resource)) throw new Error('Unsupported or missing owner control resource.');
  if (!recordId) throw new Error('Missing owner control record id.');
  return {
    id: String(body.id || `${resource}-${recordId}`),
    resource,
    recordId,
    title: String(body.title || body.metadataJson?.label || body.metadataJson?.name || body.metadataJson?.title || recordId),
    status: String(body.status || body.metadataJson?.status || (body.metadataJson?.enabled === false ? 'inactive' : 'active')),
    scope: body.scope || null,
    tenantId: body.tenantId || null,
    metadataJson: body.metadataJson || {},
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const resources = parseResources(url);
    const tenantId = url.searchParams.get('tenantId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const where: Record<string, any> = {};
    if (resources.length === 1) where.resource = resources[0];
    if (resources.length > 1) where.resource = { in: resources };
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const rows = await (prisma as any).ownerControlRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ resource: 'asc' }, { updatedAt: 'desc' }],
    });

    return json({ ok: true, data: { items: rows, count: rows.length, resources: resources.length ? resources : 'all' } });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Owner records unavailable.', err instanceof Error && err.message.includes('Unsupported') ? 400 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = normaliseBody(body);
    const record = await (prisma as any).ownerControlRecord.upsert({
      where: {
        resource_recordId: {
          resource: data.resource,
          recordId: data.recordId,
        },
      },
      update: {
        title: data.title,
        status: data.status,
        scope: data.scope,
        tenantId: data.tenantId,
        metadataJson: data.metadataJson,
      },
      create: data,
    });

    return json({ ok: true, data: record });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Owner record save failed.', 500);
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const resource = url.searchParams.get('resource');
  const recordId = url.searchParams.get('recordId');

  if (!id && (!resource || !recordId)) {
    return error('Missing id or resource + recordId.');
  }

  try {
    if (resource && !OWNER_CONTROL_RESOURCES.has(resource)) return error('Unsupported owner control resource.');
    if (resource && recordId) {
      await (prisma as any).ownerControlRecord.delete({ where: { resource_recordId: { resource, recordId } } });
    } else {
      await (prisma as any).ownerControlRecord.delete({ where: { id } });
    }
    return json({ ok: true });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Delete failed.', 500);
  }
}
