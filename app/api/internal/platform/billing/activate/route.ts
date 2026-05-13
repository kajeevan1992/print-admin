import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const tenantId = body.tenantId;

    await prisma.$executeRawUnsafe(
      'UPDATE "StoreActivation" SET "status" = $1, "activatedAt" = $2 WHERE "tenantId" = $3',
      'active',
      new Date(),
      tenantId,
    );

    return NextResponse.json({
      ok: true,
      data: {
        tenantId,
        billingStatus: 'active',
        storefrontActivated: true,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Billing activation failed.' } }, { status: 500 });
  }
}
