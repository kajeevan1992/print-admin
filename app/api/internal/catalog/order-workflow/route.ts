export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readWorkflowStore, syncWorkflowFromFinalOrders, summarizeWorkflow, transitionWorkflowItem } from '@/core/storefront/production-workflow';

export async function GET(request: NextRequest) {
  try {
    const sync = await syncWorkflowFromFinalOrders(request);
    return NextResponse.json({ ok: true, data: sync });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await transitionWorkflowItem(request, body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
