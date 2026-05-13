export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-jobs-db',
    data: {
      jobs: [],
      count: 0,
      message: 'Production jobs API scaffolded for DB-backed migration.',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    ok: true,
    source: 'internal-production-jobs-db',
    data: {
      job: {
        id: body.id || `job-${Date.now()}`,
        status: body.status || 'PENDING',
        migrated: true,
      },
    },
  });
}
