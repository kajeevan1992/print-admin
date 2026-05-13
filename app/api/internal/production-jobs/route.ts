export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listProductionJobs, saveProductionJob } from '@/core/operations/production-jobs.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-production-jobs-db',
    error: error instanceof Error ? error.message : 'Production jobs request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const machineId = request.nextUrl.searchParams.get('machineId');
    const status = request.nextUrl.searchParams.get('status');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 100);

    const jobs = await listProductionJobs(request, {
      machineId,
      status,
      limit,
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-production-jobs-db',
      data: {
        jobs,
        count: jobs.length,
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const job = await saveProductionJob(request, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-production-jobs-db',
      data: { job },
    });
  } catch (error) {
    return responseError(error);
  }
}
