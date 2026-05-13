import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe('SELECT * FROM "DeploymentBuild" ORDER BY "queuedAt" DESC LIMIT 100');
    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment builds fetch failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const id = body.id || crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      'INSERT INTO "DeploymentBuild" ("id","tenantId","deploymentId","environment","status","sourceRef","commitSha","buildNumber","healthStatus","rollbackOfBuildId","metadataJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      id,
      body.tenantId || null,
      body.deploymentId || null,
      body.environment || 'production',
      body.status || 'queued',
      body.sourceRef || null,
      body.commitSha || null,
      Number(body.buildNumber || 1),
      body.healthStatus || 'unknown',
      body.rollbackOfBuildId || null,
      body.metadataJson || {},
    );

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Deployment build save failed.' } }, { status: 500 });
  }
}
