import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type TenantStatusUi = 'active' | 'trial' | 'past_due' | 'setup';

function slugify(value: string) {
  return (value || 'tenant')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `tenant-${Date.now()}`;
}

function dbStatusToUi(status: string): TenantStatusUi {
  if (status === 'ACTIVE') return 'active';
  if (status === 'TRIAL') return 'trial';
  if (status === 'SUSPENDED') return 'past_due';
  return 'setup';
}

function uiStatusToDb(status: string) {
  if (status === 'active') return 'ACTIVE';
  if (status === 'trial') return 'TRIAL';
  if (status === 'past_due') return 'SUSPENDED';
  return 'PENDING_ACTIVATION';
}

function mapTenant(row: any) {
  const metadata = (row.metadataJson || {}) as Record<string, any>;
  const subscription = row.billingSubscriptions?.[0];
  const status = dbStatusToUi(row.status);
  const primaryContact = metadata.primaryContact || row.supportEmail || 'Not set';
  const nextInvoiceAt = metadata.nextInvoiceAt || subscription?.currentPeriodEnd?.toISOString?.().slice(0, 10) || '';
  const mrrMinor = subscription?.amountMinor || metadata.monthlyRecurringRevenueMinor || 0;

  return {
    id: row.id,
    company: row.name,
    primaryContact,
    segment: row.planName || 'Starter',
    status,
    health: metadata.health || (status === 'past_due' ? 'critical' : status === 'trial' || status === 'setup' ? 'watch' : 'healthy'),
    seatsUsed: row._count?.users ?? metadata.seatsUsed ?? 0,
    seatLimit: row.adminUsersLimit ?? metadata.seatLimit ?? 3,
    activeStores: row._count?.domains ?? metadata.activeStores ?? row.storefrontsLimit ?? 1,
    monthlyRecurringRevenue: Math.round(mrrMinor / 100),
    nextInvoiceAt,
    deploymentState: metadata.deploymentState || 'stable',
    activationState: metadata.activationState || (status === 'active' ? 'live' : status === 'trial' ? 'demo' : 'pending'),
  };
}

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: true, data: { items: [] } });
  }

  try {
    const tenants = await (prisma as any).tenant.findMany({
      include: {
        _count: { select: { users: true, domains: true } },
        billingSubscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, data: { items: tenants.map(mapTenant) } });
  } catch (error) {
    return NextResponse.json({ ok: true, data: { items: [] }, warning: error instanceof Error ? error.message : 'Tenants unavailable.' });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const slug = slugify(body.company || body.name || body.id);
  const id = body.id || undefined;
  const status = uiStatusToDb(body.status || 'setup');

  try {
    const data = {
      name: body.company || body.name || 'Untitled tenant',
      slug,
      defaultSubdomain: `${slug}.app`,
      planName: body.segment || body.planName || 'Starter',
      status,
      adminUsersLimit: Number(body.seatLimit || body.adminUsersLimit || 3),
      storefrontsLimit: Number(body.activeStores || body.storefrontsLimit || 1),
      storageLimitGb: Number(body.storageLimitGb || 10),
      supportEmail: body.supportEmail || undefined,
      metadataJson: {
        primaryContact: body.primaryContact || body.supportEmail || '',
        health: body.health || (body.status === 'past_due' ? 'critical' : 'healthy'),
        seatsUsed: Number(body.seatsUsed || 0),
        activeStores: Number(body.activeStores || 1),
        nextInvoiceAt: body.nextInvoiceAt || '',
        deploymentState: body.deploymentState || 'stable',
        activationState: body.activationState || 'pending',
        monthlyRecurringRevenueMinor: Number(body.monthlyRecurringRevenue || 0) * 100,
      },
    };

    const record = id
      ? await (prisma as any).tenant.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
          include: { _count: { select: { users: true, domains: true } }, billingSubscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        })
      : await (prisma as any).tenant.create({
          data,
          include: { _count: { select: { users: true, domains: true } }, billingSubscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });

    return NextResponse.json({ ok: true, data: mapTenant(record) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Tenant save failed.' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: { message: 'Tenant id is required.' } }, { status: 400 });

  try {
    await (prisma as any).tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { deletedId: id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Tenant delete failed.' } }, { status: 500 });
  }
}
