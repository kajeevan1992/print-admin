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
  for (const key of ['x-tenant-id', 'x-site-id', 'x-database-connection-id', 'authorization']) {
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

async function loadDesignProofReadiness(request: Request) {
  const endpoint = `${appBase(request)}/api/internal/launch/design-proof-readiness`;
  const response = await fetch(endpoint, { cache: 'no-store', headers: forwardHeaders(request) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || `Design proof readiness returned ${response.status}`;
    return {
      ok: false,
      error: message,
      checks: [{
        id: 'design-proof-readiness-api',
        group: 'Design proofing',
        label: 'Design proof readiness API',
        status: 'fail' as CheckStatus,
        detail: message,
        action: 'Open Design Proof Readiness and confirm the endpoint loads.',
        href: '/launch-design-proof-readiness',
        source: 'design-proof-readiness',
      }],
      payload,
    };
  }
  return { ok: true, error: '', checks: normalizeChecks(payload, 'design-proof-readiness'), payload: payload?.data || payload };
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
    const startedAt = new Date().toISOString();
    const [main, designProof] = await Promise.all([
      runLaunchReadinessRunner(request, { productSlug, locationSlug }),
      loadDesignProofReadiness(request),
    ]);

    const checks = [
      ...normalizeChecks(main, 'launch-readiness'),
      ...designProof.checks,
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
        designProofReadiness: { ok: designProof.ok, error: designProof.error, summary: (designProof.payload as any)?.summary || null },
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'final-launch-blockers', error: error instanceof Error ? error.message : 'Final launch blockers failed.' }, { status: 500 });
  }
}
