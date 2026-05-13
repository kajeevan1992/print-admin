import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const buildId = url.searchParams.get('buildId');

  try {
    const items = buildId
      ? await prisma.$queryRawUnsafe('SELECT * FROM "DeploymentHealthCheck" WHERE "deploymentBuildId" = $1 ORDER BY "checkedAt" DESC LIMIT 100', buildId)
      : await prisma.$queryRawUnsafe('SELECT * FROM "DeploymentHealthCheck" ORDER BY "checkedAt" DESC LIMIT 100');

    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Health checks fetch failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const id = body.id || crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      'INSERT INTO "DeploymentHealthCheck" ("id","deploymentBuildId","checkName","status","targetUrl","statusCode","message") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      id,
      body.deploymentBuildId,
      body.checkName,
      body.status || 'unknown',
      body.targetUrl || null,
      body.statusCode || null,
      body.message || null,
    );

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Health check save failed.' } }, { status: 500 });
  }
}
