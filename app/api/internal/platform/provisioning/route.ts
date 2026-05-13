import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const tenantId = body.tenantId || crypto.randomUUID();

    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: body.name,
        slug: body.slug,
        status: body.status || 'active',
      } as any,
    });

    await prisma.$executeRawUnsafe(
      'INSERT INTO "StoreActivation" ("id","tenantId","storefrontName","theme","status","activatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
      crypto.randomUUID(),
      tenant.id,
      body.storefrontName || body.name,
      body.theme || 'default-print-theme',
      'active',
      new Date(),
    );

    return NextResponse.json({
      ok: true,
      data: {
        tenant,
        storefrontActivated: true,
        themeAssigned: body.theme || 'default-print-theme',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Tenant provisioning failed.' } }, { status: 500 });
  }
}
