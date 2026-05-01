import { NextResponse } from 'next/server';
import { syncPlannerFromWorkflow, updatePlannerJob } from '@/core/storefront/production-planner';

export async function GET(request: Request) {
  try {
    const result = await syncPlannerFromWorkflow(request);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Planner failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await updatePlannerJob(request, body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Planner update failed.' } }, { status: 400 });
  }
}
