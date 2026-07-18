import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { buildFinanceReconciliation } from '@/core/finance/accounting-reconciliation.service';
import { buildAccountingExport, type AccountingExportFormat } from '@/core/finance/accounting-export.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function clean(value: unknown) { return String(value || '').trim(); }
function format(value: string): AccountingExportFormat { return ['sales-ledger', 'journal', 'vat', 'exceptions'].includes(value) ? value as AccountingExportFormat : 'sales-ledger'; }

export async function GET(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const report = await buildFinanceReconciliation(ctx.tenantId, { from: clean(request.nextUrl.searchParams.get('from')), to: clean(request.nextUrl.searchParams.get('to')), storeSlug: clean(request.nextUrl.searchParams.get('storeSlug')) });
    const output = buildAccountingExport(report, format(clean(request.nextUrl.searchParams.get('format'))));
    return new NextResponse(output.body, { headers: { 'Content-Type': output.contentType, 'Content-Disposition': `attachment; filename="${output.filename}"`, 'Cache-Control': 'private, no-store', 'X-Export-Rows': String(output.rowCount) } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Accounting export failed.' }, { status: 400 });
  }
}
