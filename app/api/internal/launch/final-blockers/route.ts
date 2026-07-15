import { NextResponse } from 'next/server';
import { runLaunchReadinessRunner } from '@/core/launch/launch-readiness-runner.service';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type LaunchCheck = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
  source?: string;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function appBase(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function forwardHeaders(request: Request) {
  const headers = new Headers();
  for (const key of ['cookie', 'x-tenant-id', 'x-site-id', 'x-database-connection-id', 'authorization']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  return headers;
}

function normalizeStatus(value: unknown): CheckStatus {
  const status = clean(value).toLowerCase();
  if (status === 'fail' || status === 'failed' || status === 'error') return 'fail';
  if (status === 'warn' || status === 'warning' || status === 'review') return 'warn';
  if (status === 'skip' || status === 'skipped') return 'skip';
  return 'pass';
}

function normalizeChecks(payload: any, source: string): LaunchCheck[] {
  const data = payload?.data || payload || {};
  const checks = Array.isArray(data.checks) ? data.checks : [];
  return checks.map((check: any, index: number) => ({
    id: clean(check.id) || `${source}-${index + 1}`,
    group: clean(check.group) || source,
    label: clean(check.label) || clean(check.name) || `Check ${index + 1}`,
    status: normalizeStatus(check.status ?? (check.ok === false ? 'fail' : 'pass')),
    detail: clean(check.detail) || clean(check.message) || 'No details provided.',
    action: clean(check.action) || undefined,
    href: clean(check.href) || undefined,
    data: check.data && typeof check.data === 'object' ? check.data : undefined,
    source,
  }));
}

async function loadReadinessEndpoint(request: Request, path: string, source: string, group: string, label: string, actionHref: string, searchParams = '') {
  const endpoint = `${appBase(request)}${path}${searchParams}`;
  const response = await fetch(endpoint, { cache: 'no-store', headers: forwardHeaders(request) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || `${label} returned ${response.status}`;
    return {
      ok: false,
      error: message,
      checks: [{
        id: `${source}-api`,
        group,
        label,
        status: 'fail' as CheckStatus,
        detail: message,
        action: `Open ${label} and confirm the endpoint loads.`,
        href: actionHref,
        source,
      }],
      payload,
    };
  }
  return { ok: true, error: '', checks: normalizeChecks(payload, source), payload: payload?.data || payload };
}

function summarize(checks: LaunchCheck[]) {
  return {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
}

function groupCounts(checks: LaunchCheck[]) {
  const groups: Record<string, ReturnType<typeof summarize>> = {};
  for (const check of checks) {
    const key = check.group || 'Other';
    groups[key] ||= { total: 0, pass: 0, warn: 0, fail: 0, skip: 0 };
    groups[key].total += 1;
    groups[key][check.status] += 1;
  }
  return groups;
}

function confidence(summary: ReturnType<typeof summarize>) {
  const raw = Math.round(((summary.pass + summary.skip * 0.35) / Math.max(1, summary.total)) * 100 - summary.fail * 12 - summary.warn * 3);
  return Math.max(0, Math.min(100, raw));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productSlug = clean(url.searchParams.get('productSlug')) || 'business-cards';
    const locationSlug = clean(url.searchParams.get('locationSlug')) || 'sidcup';
    const extraPaths = clean(url.searchParams.get('paths'));
    const startedAt = new Date().toISOString();
    const contentSearch = new URLSearchParams({ productSlug, locationSlug });
    if (extraPaths) contentSearch.set('paths', extraPaths);

    const [main, security, customerData, customerPublicFlow, publicEndpointAbuse, themeSaasConnection, liveEnvironment, designProof, storefrontContent] = await Promise.all([
      runLaunchReadinessRunner(request, { productSlug, locationSlug }),
      loadReadinessEndpoint(request, '/api/internal/launch/security-access-audit', 'security-access-audit', 'Security and access', 'Security access audit API', '/launch-security-access-audit'),
      loadReadinessEndpoint(request, '/api/internal/launch/customer-data-exposure-audit', 'customer-data-exposure-audit', 'Customer data exposure', 'Customer data exposure audit API', '/customer-data-exposure-audit'),
      loadReadinessEndpoint(request, '/api/internal/launch/customer-public-flow-audit', 'customer-public-flow-audit', 'Customer public flows', 'Customer public flow audit API', '/customer-public-flow-audit'),
      loadReadinessEndpoint(request, '/api/internal/launch/public-endpoint-abuse-readiness', 'public-endpoint-abuse-readiness', 'Public endpoint abuse', 'Public endpoint abuse readiness API', '/public-endpoint-abuse-readiness'),
      loadReadinessEndpoint(request, '/api/internal/launch/internal-theme-saas-connection-audit', 'internal-theme-saas-connection-audit', 'Theme SaaS connection', 'Theme SaaS connection audit API', '/theme-saas-connection-audit'),
      loadReadinessEndpoint(request, '/api/internal/launch/live-environment-readiness', 'live-environment-readiness', 'Live environment', 'Live environment readiness API', '/live-environment-readiness'),
      loadReadinessEndpoint(request, '/api/internal/launch/design-proof-readiness', 'design-proof-readiness', 'Design proofing', 'Design proof readiness API', '/launch-design-proof-readiness'),
      loadReadinessEndpoint(request, '/api/internal/launch/storefront-content-readiness', 'storefront-content-readiness', 'Storefront content', 'Storefront content readiness API', '/storefront-content-readiness', `?${contentSearch.toString()}`),
    ]);

    const checks = [
      ...normalizeChecks(main, 'launch-readiness'),
      ...security.checks,
      ...customerData.checks,
      ...customerPublicFlow.checks,
      ...publicEndpointAbuse.checks,
      ...themeSaasConnection.checks,
      ...liveEnvironment.checks,
      ...designProof.checks,
      ...storefrontContent.checks,
    ];
    const summary = summarize(checks);
    const hardBlockers = checks.filter((item) => item.status === 'fail');
    const reviewItems = checks.filter((item) => item.status === 'warn');
    const testGaps = checks.filter((item) => item.status === 'skip');
    const launchStatus = hardBlockers.length ? 'blocked' : reviewItems.length ? 'review' : 'ready';
    const softLaunchAllowed = hardBlockers.length === 0;
    const finalConfidence = confidence(summary);
    const nextActions = [...hardBlockers, ...reviewItems]
      .map((item) => ({ id: item.id, source: item.source, group: item.group, label: item.label, status: item.status, action: item.action || item.detail, href: item.href }))
      .slice(0, 20);

    return NextResponse.json({
      ok: hardBlockers.length === 0,
      source: 'final-launch-blockers',
      mode: 'read-only',
      productSlug,
      locationSlug,
      launchStatus,
      softLaunchAllowed,
      confidence: finalConfidence,
      summary,
      groups: groupCounts(checks),
      hardBlockers,
      reviewItems,
      testGaps,
      nextActions,
      checks,
      upstream: {
        launchReadiness: { launchStatus: main.launchStatus, score: main.score, summary: main.summary },
        securityAccessAudit: { ok: security.ok, error: security.error, launchStatus: (security.payload as any)?.launchStatus || null, summary: (security.payload as any)?.summary || null },
        customerDataExposureAudit: { ok: customerData.ok, error: customerData.error, launchStatus: (customerData.payload as any)?.launchStatus || null, score: (customerData.payload as any)?.score || null, summary: (customerData.payload as any)?.summary || null },
        customerPublicFlowAudit: { ok: customerPublicFlow.ok, error: customerPublicFlow.error, launchStatus: (customerPublicFlow.payload as any)?.launchStatus || null, summary: (customerPublicFlow.payload as any)?.summary || null },
        publicEndpointAbuseReadiness: { ok: publicEndpointAbuse.ok, error: publicEndpointAbuse.error, launchStatus: (publicEndpointAbuse.payload as any)?.launchStatus || null, controls: (publicEndpointAbuse.payload as any)?.controls || null, summary: (publicEndpointAbuse.payload as any)?.summary || null },
        themeSaasConnectionAudit: { ok: themeSaasConnection.ok, error: themeSaasConnection.error, launchStatus: (themeSaasConnection.payload as any)?.launchStatus || null, adminConnected: (themeSaasConnection.payload as any)?.adminConnected || false, noDemoDataConfirmed: (themeSaasConnection.payload as any)?.noDemoDataConfirmed || false, summary: (themeSaasConnection.payload as any)?.summary || null },
        liveEnvironmentReadiness: { ok: liveEnvironment.ok, error: liveEnvironment.error, launchStatus: (liveEnvironment.payload as any)?.launchStatus || null, summary: (liveEnvironment.payload as any)?.summary || null, upstream: (liveEnvironment.payload as any)?.upstream || null },
        designProofReadiness: { ok: designProof.ok, error: designProof.error, summary: (designProof.payload as any)?.summary || null },
        storefrontContentReadiness: { ok: storefrontContent.ok, error: storefrontContent.error, launchStatus: (storefrontContent.payload as any)?.launchStatus || null, score: (storefrontContent.payload as any)?.score || null, summary: (storefrontContent.payload as any)?.summary || null },
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'final-launch-blockers', error: error instanceof Error ? error.message : 'Final launch blockers failed.' }, { status: 500 });
  }
}
