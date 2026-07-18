import { NextRequest, NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { buildFinanceReconciliation, saveFinanceReconciliationRun } from '@/core/finance/accounting-reconciliation.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function clean(value: unknown) { return String(value || '').trim(); }
function authorised(request: NextRequest) {
  const secret = clean(process.env.FINANCE_RECONCILIATION_CRON_SECRET || process.env.CRON_SECRET);
  if (!secret) return { ok: false, status: 503, error: 'Finance reconciliation cron secret is not configured.' };
  const provided = clean(request.headers.get('authorization')).replace(/^Bearer\s+/i, '') || clean(request.nextUrl.searchParams.get('secret'));
  return provided === secret ? { ok: true, status: 200, error: '' } : { ok: false, status: 401, error: 'Invalid reconciliation cron secret.' };
}
async function run(request: NextRequest) {
  const auth = authorised(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const now = new Date();
  const from = clean(request.nextUrl.searchParams.get('from')) || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = clean(request.nextUrl.searchParams.get('to')) || now.toISOString().slice(0, 10);
  const requestedTenant = clean(request.nextUrl.searchParams.get('tenant'));
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE status=\'ACTIVE\' AND ($1=\'\' OR id=$1 OR slug=$1 OR "defaultSubdomain"=$1) ORDER BY "createdAt" ASC LIMIT 500', requestedTenant);
  const results: Array<Record<string, unknown>> = [];
  for (const tenant of rows) {
    try {
      const report = await buildFinanceReconciliation(tenant.id, { from, to });
      await saveFinanceReconciliationRun(report);
      results.push({ tenantId: tenant.id, tenantSlug: tenant.slug, ok: true, issueCount: report.summary.issueCount, criticalCount: report.summary.criticalCount });
    } catch (error) {
      results.push({ tenantId: tenant.id, tenantSlug: tenant.slug, ok: false, error: error instanceof Error ? error.message : 'Reconciliation failed.' });
    }
  }
  return NextResponse.json({ ok: results.every((item) => item.ok), source: 'scheduled-finance-reconciliation', period: { from, to }, processed: results.length, failed: results.filter((item) => !item.ok).length, results });
}
export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) { return run(request); }
