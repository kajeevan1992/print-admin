import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe('SELECT * FROM "StoreActivation" ORDER BY "createdAt" DESC LIMIT 100');
    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Store activation fetch failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const id = body.id || crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      'INSERT INTO "StoreActivation" ("id","tenantId","storefrontName","theme","status","activatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
      id,
      body.tenantId,
      body.storefrontName,
      body.theme || null,
      body.status || 'inactive',
      body.activatedAt ? new Date(body.activatedAt) : null,
    );

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Store activation save failed.' } }, { status: 500 });
  }
}
