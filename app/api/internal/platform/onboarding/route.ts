import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe('SELECT * FROM "TenantOnboarding" ORDER BY "createdAt" DESC LIMIT 100');
    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Onboarding fetch failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const id = body.id || crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      'INSERT INTO "TenantOnboarding" ("id","tenantId","companyName","ownerName","ownerEmail","status","checklistJson") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      id,
      body.tenantId || null,
      body.companyName,
      body.ownerName || null,
      body.ownerEmail,
      body.status || 'pending',
      body.checklistJson || {},
    );

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Onboarding save failed.' } }, { status: 500 });
  }
}
