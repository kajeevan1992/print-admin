import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const buildId = url.searchParams.get('buildId');

  try {
    const items = buildId
      ? await prisma.$queryRawUnsafe('SELECT * FROM "DeploymentLog" WHERE "deploymentBuildId" = $1 ORDER BY "createdAt" DESC LIMIT 500', buildId)
      : await prisma.$queryRawUnsafe('SELECT * FROM "DeploymentLog" ORDER BY "createdAt" DESC LIMIT 500');

    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment logs fetch failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const id = body.id || crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      'INSERT INTO "DeploymentLog" ("id","deploymentBuildId","level","message") VALUES ($1,$2,$3,$4)',
      id,
      body.deploymentBuildId,
      body.level || 'info',
      body.message,
    );

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment log save failed.' } }, { status: 500 });
  }
}
