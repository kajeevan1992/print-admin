export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProductionJob, saveProductionJob } from '@/core/operations/production-jobs.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-production-jobs-db',
    error: error instanceof Error ? error.message : 'Production job request failed.',
  }, { status });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const job = await getProductionJob(request, context.params.id);

    if (!job) {
      return responseError(new Error('Production job not found.'), 404);
    }

    return NextResponse.json({
      ok: true,
      source: 'internal-production-jobs-db',
      data: { job },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const job = await saveProductionJob(request, {
      ...body,
      id: context.params.id,
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-production-jobs-db',
      data: { job },
    });
  } catch (error) {
    return responseError(error);
  }
}
