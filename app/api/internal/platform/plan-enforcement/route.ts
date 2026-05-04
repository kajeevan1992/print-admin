import { NextResponse } from 'next/server';
import { checkTenantPlanLimits, platformPlanSummary } from '@/core/platform/plan-enforcement';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');

  if (tenantId) {
    const checks = await checkTenantPlanLimits(tenantId);
    return NextResponse.json({ ok: true, data: { tenantId, checks } });
  }

  const summary = await platformPlanSummary();
  return NextResponse.json({ ok: true, data: summary });
}
