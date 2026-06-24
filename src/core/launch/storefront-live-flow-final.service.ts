import { runStorefrontOrderE2e } from './storefront-order-e2e.service';
import { buildPaymentCheckoutQa } from './payment-checkout-qa.service';
import { buildEmailOrderNotificationQa } from './email-order-notification-qa.service';
import { listStoreChannels } from '@/core/storefront/store-channels.service';
import { getPaymentAccountsReadiness } from '@/core/billing/payment-accounts.service';

export type LiveFlowSeverity = 'pass' | 'warning' | 'error' | 'info';
export type LiveFlowCheck = { id: string; group: string; severity: LiveFlowSeverity; label: string; detail: string; action?: string };
function check(id: string, group: string, severity: LiveFlowSeverity, label: string, detail: string, action = ''): LiveFlowCheck { return { id, group, severity, label, detail, action }; }
function pass(id: string, group: string, label: string, detail: string, action = '') { return check(id, group, 'pass', label, detail, action); }
function warn(id: string, group: string, label: string, detail: string, action = '') { return check(id, group, 'warning', label, detail, action); }
function fail(id: string, group: string, label: string, detail: string, action = '') { return check(id, group, 'error', label, detail, action); }
function info(id: string, group: string, label: string, detail: string, action = '') { return check(id, group, 'info', label, detail, action); }
function reduceSummary(checks: LiveFlowCheck[]) { return checks.reduce((acc, item) => { acc.checks += 1; acc[item.severity] += 1; return acc; }, { checks: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<LiveFlowSeverity | 'checks', number>); }
function addExternalReportChecks(prefix: string, group: string, checks: LiveFlowCheck[], report: any) { if (!report) { checks.push(fail(`${prefix}-missing`, group, `${group} report missing`, 'The underlying QA report did not return data.')); return; } if (report.ready) checks.push(pass(`${prefix}-ready`, group, `${group} ready`, `Score ${report.score ?? 'n/a'}/100.`)); else checks.push(fail(`${prefix}-not-ready`, group, `${group} has blocking issues`, `Score ${report.score ?? 'n/a'}/100.`, `Open the ${group} QA page and fix failing checks.`)); const warnings = Number(report.summary?.warning || 0); if (warnings) checks.push(warn(`${prefix}-warnings`, group, `${group} warnings`, `${warnings} warning(s) need review before launch.`)); }
export async function buildStorefrontLiveFlowFinal(request: Request) {
  const checks: LiveFlowCheck[] = [];
  const e2e = await runStorefrontOrderE2e(request, { mode: 'dry-run', scenario: 'all' });
  const payment = await buildPaymentCheckoutQa(request, { mode: 'dry-run' });
  const email = await buildEmailOrderNotificationQa(request, { mode: 'dry-run' });
  const channels = await listStoreChannels('', undefined).catch((error) => ({ items: [], error: error instanceof Error ? error.message : 'Channel load failed.' } as any));
  const paymentAccounts = await getPaymentAccountsReadiness().catch((error) => ({ error: error instanceof Error ? error.message : 'Payment account readiness failed.' } as any));
  addExternalReportChecks('e2e', 'Storefront Order E2E', checks, e2e);
  addExternalReportChecks('payment', 'Payment Checkout QA', checks, payment);
  addExternalReportChecks('email', 'Email Notification QA', checks, email);
  const hosted = Array.isArray(channels.items) ? channels.items.filter((item: any) => !item.isHeadless) : [];
  const external = Array.isArray(channels.items) ? channels.items.filter((item: any) => item.isHeadless) : [];
  if (hosted.length) checks.push(pass('hosted-channel', 'Store Channels', 'Hosted channel exists', `${hosted.length} hosted channel(s) configured.`)); else checks.push(warn('hosted-channel', 'Store Channels', 'No hosted channel found', 'Create or bootstrap at least one hosted channel for SaaS-hosted storefront testing.', 'Open /business-defaults or /channels.'));
  if (external.length) checks.push(info('external-channel', 'Store Channels', 'External API channel exists', `${external.length} external/headless channel(s) configured.`));
  if ((paymentAccounts as any).tenantConnectReady) checks.push(pass('tenant-connect-ready', 'Payment Accounts', 'Tenant Stripe Connect env ready', 'Customer order payments can be connected to tenant Stripe accounts.'));
  else checks.push(warn('tenant-connect-missing', 'Payment Accounts', 'Tenant Stripe Connect env missing', 'Tenant customer payments are not ready for live Stripe Connect.', 'Add STRIPE_CONNECT_CLIENT_ID and STRIPE_SECRET_KEY.'));
  if ((paymentAccounts as any).platformBillingReady) checks.push(pass('platform-billing-ready', 'Platform Billing', 'Platform subscription billing env ready', 'SaaS monthly/yearly billing env is present.'));
  else checks.push(warn('platform-billing-missing', 'Platform Billing', 'Platform subscription billing env missing', 'Monthly/yearly SaaS billing cannot be started yet.', 'Add platform Stripe price/env values.'));
  checks.push(info('manual-browser-flow', 'Manual Browser Flow', 'Manual hosted storefront click test still required', 'After dry-run checks pass, open the hosted storefront in the browser and manually test product list, product detail, cart, checkout, customer account and order history.'));
  const summary = reduceSummary(checks);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 18 - summary.warning * 6));
  const ready = summary.error === 0;
  const nextActions = checks.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 12);
  return { ready, score, generatedAt: new Date().toISOString(), summary, checks, nextActions, reports: { e2e, payment: { ready: payment.ready, score: payment.score, summary: payment.summary }, email: { ready: email.ready, score: email.score, summary: email.summary }, channels: { total: channels.items?.length || 0, hosted: hosted.length, external: external.length }, paymentAccounts } };
}
