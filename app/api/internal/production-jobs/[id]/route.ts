export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return NextResponse.json({
    ok: true,
    source: 'internal-production-jobs-db',
    data: {
      job: {
        id: context.params.id,
        status: 'PENDING',
        migrated: true,
      },
    },
  });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    ok: true,
    source: 'internal-production-jobs-db',
    data: {
      job: {
        id: context.params.id,
        ...body,
        migrated: true,
      },
    },
  });
}
