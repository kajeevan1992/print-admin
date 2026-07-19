import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { buildAccountingCsv, buildAccountingReport } from '@/core/accounting/accounting-reconciliation.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const kinds = new Set(['sales', 'vat', 'credit-notes', 'reconciliation']);

export async function GET(request: NextRequest) {
  try {
    const tenant = tenantContextFromRequest(request);
    const requestedKind = String(request.nextUrl.searchParams.get('kind') || 'reconciliation');
    const kind = (kinds.has(requestedKind) ? requestedKind : 'reconciliation') as 'sales' | 'vat' | 'credit-notes' | 'reconciliation';
    const report = await buildAccountingReport(request, tenant.tenantId, {
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
      storeSlug: request.nextUrl.searchParams.get('storeSlug'),
      search: request.nextUrl.searchParams.get('search'),
    });
    const csv = buildAccountingCsv(report, kind);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${kind}-${stamp}.csv"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Accounting export could not be generated.' }, { status: 500 });
  }
}
