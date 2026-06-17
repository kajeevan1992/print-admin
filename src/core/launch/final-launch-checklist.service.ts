import { buildLaunchGuardReport } from './launch-guard.service';
import { buildBackupRecoveryReadiness } from './backup-recovery-readiness.service';
import { runPaymentCheckoutQa } from './payment-checkout-qa.service';
import { runStorefrontOrderE2e } from './storefront-order-e2e.service';
import { buildEmailOrderNotificationQa } from './email-order-notification-qa.service';
import { buildSeoLiveReadiness } from '@/core/seo/seo-live-readiness.service';

export type FinalLaunchSeverity = 'pass' | 'warning' | 'error' | 'info';
export type FinalLaunchArea = 'platform' | 'storefront' | 'payment' | 'email' | 'seo' | 'data' | 'security' | 'manual';
export type FinalLaunchItem = {
  id: string;
  area: FinalLaunchArea;
  severity: FinalLaunchSeverity;
  label: string;
  detail: string;
  route?: string;
  action?: string;
};

function item(id: string, area: FinalLaunchArea, severity: FinalLaunchSeverity, label: string, detail: string, route = '', action = ''): FinalLaunchItem {
  return { id, area, severity, label, detail, route, action };
}
function pass(id: string, area: FinalLaunchArea, label: string, detail: string, route = '', action = '') { return item(id, area, 'pass', label, detail, route, action); }
function warn(id: string, area: FinalLaunchArea, label: string, detail: string, route = '', action = '') { return item(id, area, 'warning', label, detail, route, action); }
function fail(id: string, area: FinalLaunchArea, label: string, detail: string, route = '', action = '') { return item(id, area, 'error', label, detail, route, action); }
function info(id: string, area: FinalLaunchArea, label: string, detail: string, route = '', action = '') { return item(id, area, 'info', label, detail, route, action); }

function env(name: string) { return String(process.env[name] || '').trim(); }
function hasEnv(name: string) { return Boolean(env(name)); }
function summaryHasErrors(summary: any) { return Number(summary?.error || 0) > 0; }
function summaryHasWarnings(summary: any) { return Number(summary?.warning || 0) > 0; }
function scoreOf(report: any) { const score = Number(report?.score); return Number.isFinite(score) ? score : 0; }

async function safeReport<T>(fn: () => Promise<T>, label: string) {
  try { return { ok: true, data: await fn() }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : `${label} failed.` }; }
}

function reportItem(id: string, area: FinalLaunchArea, label: string, route: string, report: any, failedMessage: string) {
  if (!report?.ok) return fail(id, area, label, failedMessage || report?.error || 'Report failed.', route, 'Open the linked QA page and fix the failure.');
  const data = report.data;
  if (summaryHasErrors(data?.summary) || data?.ready === false && scoreOf(data) < 60) return fail(id, area, label, `Score ${scoreOf(data)}/100. Blocking errors detected.`, route, 'Fix red errors before launch.');
  if (summaryHasWarnings(data?.summary) || data?.ready === false) return warn(id, area, label, `Score ${scoreOf(data)}/100. Warnings remain.`, route, 'Review warnings and decide if launch can continue.');
  return pass(id, area, label, `Score ${scoreOf(data)}/100. No blocking issues detected.`, route);
}

function envItems() {
  const items: FinalLaunchItem[] = [];
  if (hasEnv('DATABASE_URL')) items.push(pass('env-database', 'platform', 'Database configured', 'DATABASE_URL is present.'));
  else items.push(fail('env-database', 'platform', 'Database missing', 'DATABASE_URL is missing.', '/data-continuity', 'Add Vercel Postgres/Neon DATABASE_URL.'));
  if (hasEnv('DEFAULT_TENANT_ID')) items.push(pass('env-tenant', 'platform', 'Default tenant configured', `DEFAULT_TENANT_ID=${env('DEFAULT_TENANT_ID')}.`));
  else items.push(warn('env-tenant', 'platform', 'Default tenant missing', 'DEFAULT_TENANT_ID is not set.', '/admin-launch-security', 'Set DEFAULT_TENANT_ID=holo-print.'));
  if (hasEnv('NEXT_PUBLIC_APP_URL') || hasEnv('ADMIN_URL') || hasEnv('NEXT_PUBLIC_ADMIN_URL')) items.push(pass('env-admin-url', 'platform', 'Admin URL configured', 'Admin/app URL env is present.'));
  else items.push(warn('env-admin-url', 'platform', 'Admin URL missing', 'Admin URL env is missing.', '/admin-launch-security', 'Set NEXT_PUBLIC_APP_URL to the Vercel admin domain.'));
  if (hasEnv('STOREFRONT_URL') || hasEnv('NEXT_PUBLIC_STOREFRONT_URL') || hasEnv('CORS_ORIGINS') || hasEnv('ALLOWED_ORIGINS')) items.push(pass('env-storefront-url', 'storefront', 'Storefront origin configured', 'Storefront/origin env is present.'));
  else items.push(warn('env-storefront-url', 'storefront', 'Storefront origin missing', 'No storefront/origin env was found.', '/admin-launch-security', 'Set live storefront URL/allowed origin.'));
  return items;
}

function manualItems() {
  return [
    info('manual-domain-dns', 'manual', 'Domain/DNS verified', 'Confirm live domain DNS, SSL and redirects are correct.', '/admin-launch-security'),
    info('manual-payment-mode', 'manual', 'Stripe mode chosen', 'Confirm test/live Stripe mode before accepting real customer payments.', '/payment-checkout-qa'),
    info('manual-email-inbox', 'manual', 'Email inbox monitored', 'Confirm order/admin notification inbox is monitored by the team.', '/email-order-notification-qa'),
    info('manual-restore-runbook', 'manual', 'Restore runbook written', 'Document how to restore database from provider snapshot/export.', '/data-continuity'),
    info('manual-first-order', 'manual', 'First live order plan', 'Decide who watches the first real customer order from checkout to production.', '/storefront-order-test'),
  ];
}

export async function buildFinalLaunchChecklist(request: Request) {
  const [guard, data, payment, storefront, email, seo] = await Promise.all([
    safeReport(() => buildLaunchGuardReport(), 'Launch Guard'),
    safeReport(() => buildBackupRecoveryReadiness(), 'Data Continuity'),
    safeReport(() => runPaymentCheckoutQa(request, { mode: 'dry-run' } as any), 'Payment QA'),
    safeReport(() => runStorefrontOrderE2e(request, { mode: 'dry-run', scenario: 'mixed-vat' } as any), 'Storefront order test'),
    safeReport(() => buildEmailOrderNotificationQa(request, { mode: 'dry-run' }), 'Email QA'),
    safeReport(() => buildSeoLiveReadiness(request), 'SEO readiness'),
  ]);

  const items: FinalLaunchItem[] = [
    ...envItems(),
    reportItem('qa-launch-guard', 'security', 'Launch Guard', '/admin-launch-security', guard, 'Launch Guard could not run.'),
    reportItem('qa-data-continuity', 'data', 'Data Check', '/data-continuity', data, 'Data Check could not run.'),
    reportItem('qa-payment', 'payment', 'Payment Checkout QA', '/payment-checkout-qa', payment, 'Payment Checkout QA could not run.'),
    reportItem('qa-storefront-order', 'storefront', 'Storefront Order Test', '/storefront-order-test', storefront, 'Storefront Order Test could not run.'),
    reportItem('qa-email', 'email', 'Mail QA', '/email-order-notification-qa', email, 'Mail QA could not run.'),
    reportItem('qa-seo', 'seo', 'SEO Live Readiness', '/seo-live-readiness', seo, 'SEO readiness could not run.'),
    ...manualItems(),
  ];

  const summary = items.reduce((acc, current) => { acc.items += 1; acc[current.severity] += 1; return acc; }, { items: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<FinalLaunchSeverity | 'items', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 18 - summary.warning * 7));
  const launchReady = summary.error === 0;
  const goNoGo = summary.error > 0 ? 'NO-GO' : summary.warning > 0 ? 'GO WITH CAUTION' : 'GO';
  const nextActions = items.filter((current) => current.severity === 'error' || current.severity === 'warning').map((current) => ({ label: current.label, detail: current.detail, action: current.action, route: current.route, severity: current.severity, area: current.area }));

  return {
    launchReady,
    goNoGo,
    score,
    generatedAt: new Date().toISOString(),
    summary,
    reports: {
      launchGuard: guard.ok ? guard.data : { error: guard.error },
      dataContinuity: data.ok ? data.data : { error: data.error },
      payment: payment.ok ? payment.data : { error: payment.error },
      storefront: storefront.ok ? storefront.data : { error: storefront.error },
      email: email.ok ? email.data : { error: email.error },
      seo: seo.ok ? seo.data : { error: seo.error },
    },
    items,
    nextActions,
  };
}
