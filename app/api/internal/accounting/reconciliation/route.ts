import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { buildAccountingReport } from '@/core/accounting/accounting-reconciliation.service';

export const dynamic = 'force-dynamic';
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  try {
    const tenant = tenantContextFromRequest(request);
    const report = await buildAccountingReport(request, tenant.tenantId, {
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
      storeSlug: request.nextUrl.searchParams.get('storeSlug'),
      search: request.nextUrl.searchParams.get('search'),
    });
    return json({ ok: true, source: 'accounting-reconciliation', data: report });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Accounting reconciliation could not be generated.' }, { status: 500 });
  }
}
