import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HealthLevel = 'ok' | 'watch' | 'blocked';

type HealthCheck = {
  id: string;
  group: string;
  label: string;
  level: HealthLevel;
  detail: string;
  href?: string;
  action?: string;
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

async function loadEndpoint(request: Request, path: string, params: URLSearchParams, label: string) {
  const endpoint = `${appBase(request)}${path}?${params.toString()}`;
  const response = await fetch(endpoint, { cache: 'no-store', headers: forwardHeaders(request) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    return { ok: false, error: payload?.error || `${label} returned ${response.status}`, payload };
  }
  return { ok: true, error: '', payload };
}

function check(id: string, group: string, label: string, level: HealthLevel, detail: string, href?: string, action?: string): HealthCheck {
  return { id, group, label, level, detail, href, action };
}

function healthScore(checks: HealthCheck[]) {
  const raw = 100 - checks.filter((item) => item.level === 'blocked').length * 25 - checks.filter((item) => item.level === 'watch').length * 8;
  return Math.max(0, Math.min(100, raw));
}

function launchState(checks: HealthCheck[]) {
  if (checks.some((item) => item.level === 'blocked')) return 'blocked';
  if (checks.some((item) => item.level === 'watch')) return 'watch';
  return 'healthy';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productSlug = clean(url.searchParams.get('productSlug')) || 'business-cards';
    const locationSlug = clean(url.searchParams.get('locationSlug')) || 'sidcup';
    const paths = clean(url.searchParams.get('paths'));
    const limit = clean(url.searchParams.get('limit')) || '10';
    const includeTests = url.searchParams.get('includeTests') === 'true';
    const startedAt = new Date().toISOString();

    const finalParams = new URLSearchParams({ productSlug, locationSlug });
    if (paths) finalParams.set('paths', paths);
    const monitorParams = new URLSearchParams({ limit, includeTests: includeTests ? 'true' : 'false' });

    const [finalBlockers, liveOrders] = await Promise.all([
      loadEndpoint(request, '/api/internal/launch/final-blockers', finalParams, 'Final Launch Blockers'),
      loadEndpoint(request, '/api/internal/launch/first-live-order-monitor', monitorParams, 'First Live Order Monitor'),
    ]);

    const finalPayload = finalBlockers.payload || {};
    const livePayload = liveOrders.payload || {};
    const finalSummary = finalPayload.summary || {};
    const liveSummary = livePayload.summary || {};
    const liveItems = Array.isArray(livePayload.items) ? livePayload.items : [];

    const checks: HealthCheck[] = [];

    if (!finalBlockers.ok) {
      checks.push(check('final-blockers-api', 'Launch readiness', 'Final blockers API', 'blocked', finalBlockers.error, '/final-launch-blockers', 'Open Final Launch Blockers and confirm the API loads.'));
    } else if (Number(finalSummary.fail || finalPayload.hardBlockers?.length || 0) > 0) {
      checks.push(check('final-blockers-failed', 'Launch readiness', 'Hard launch blockers still exist', 'blocked', `${finalSummary.fail || finalPayload.hardBlockers?.length || 0} hard blocker(s) remain.`, '/final-launch-blockers', 'Fix blockers before pushing more traffic.'));
    } else if (Number(finalSummary.warn || finalPayload.reviewItems?.length || 0) > 0) {
      checks.push(check('final-blockers-review', 'Launch readiness', 'Launch review warnings remain', 'watch', `${finalSummary.warn || finalPayload.reviewItems?.length || 0} review warning(s) remain.`, '/final-launch-blockers', 'Review warnings and decide whether they are acceptable during soft launch.'));
    } else {
      checks.push(check('final-blockers-clear', 'Launch readiness', 'Final blockers clear', 'ok', 'No hard blockers reported by Final Launch Blockers.', '/final-launch-blockers'));
    }

    if (!liveOrders.ok) {
      checks.push(check('first-live-monitor-api', 'Live orders', 'First Live Order Monitor API', 'blocked', liveOrders.error, '/first-live-order-monitor', 'Open the monitor and confirm recent orders load.'));
    } else if (Number(liveSummary.blocked || 0) > 0) {
      checks.push(check('live-orders-blocked', 'Live orders', 'Blocked live orders', 'blocked', `${liveSummary.blocked} live order(s) have blocked payment, proof, production, dispatch or email risks.`, '/first-live-order-monitor', 'Open the monitor and resolve blocked order risks.'));
    } else if (Number(liveSummary.watch || 0) > 0) {
      checks.push(check('live-orders-watch', 'Live orders', 'Orders need watching', 'watch', `${liveSummary.watch} order(s) need operator attention.`, '/first-live-order-monitor', 'Watch these orders through payment, artwork, proof and production.'));
    } else if (Number(liveSummary.total || 0) === 0) {
      checks.push(check('waiting-first-order', 'Live orders', 'Waiting for first live order', 'watch', 'No non-test live orders are visible yet. Keep the monitor open during launch.', '/first-live-order-monitor', 'Place or wait for the first real customer order.'));
    } else {
      checks.push(check('live-orders-healthy', 'Live orders', 'Live order flow healthy', 'ok', `${liveSummary.total} recent live order(s) are not blocked.`, '/first-live-order-monitor'));
    }

    const failedEmails = liveItems.flatMap((item: any) => Array.isArray(item.emails) ? item.emails : []).filter((email: any) => ['failed', 'smtp-not-configured', 'needs-email-address'].includes(clean(email.status).toLowerCase()));
    if (failedEmails.length) {
      checks.push(check('email-errors', 'Notifications', 'Email outbox has delivery issues', 'blocked', `${failedEmails.length} matching order email(s) failed or need configuration.`, '/email-outbox', 'Open Email Outbox and retry or fix SMTP settings.'));
    } else if (Number(liveSummary.emails || 0) === 0) {
      checks.push(check('email-no-records', 'Notifications', 'No launch emails found yet', 'watch', 'No email outbox records were found by the live order monitor yet.', '/email-outbox', 'Confirm customer and admin notifications queue after the first order.'));
    } else {
      checks.push(check('email-healthy', 'Notifications', 'Email outbox visible', 'ok', `${liveSummary.emails} email record(s) are visible to the monitor.`, '/email-outbox'));
    }

    const productionTickets = Number(liveSummary.productionTickets || 0);
    if (Number(liveSummary.total || 0) > 0 && productionTickets === 0) {
      checks.push(check('production-no-tickets', 'Production', 'No production tickets visible', 'watch', 'Live orders exist but no production tickets are visible yet. This can be normal before artwork/proof approval.', '/production-planner', 'Confirm approved/paid work creates tickets before printing.'));
    } else {
      checks.push(check('production-visible', 'Production', 'Production ticket storage visible', 'ok', `${productionTickets} production ticket(s) are visible to the monitor.`, '/production-planner'));
    }

    const summary = {
      total: checks.length,
      ok: checks.filter((item) => item.level === 'ok').length,
      watch: checks.filter((item) => item.level === 'watch').length,
      blocked: checks.filter((item) => item.level === 'blocked').length,
      liveOrders: Number(liveSummary.total || 0),
      sourceOrders: Number(liveSummary.sourceOrders || 0),
      productionTickets,
      emails: Number(liveSummary.emails || 0),
    };

    const status = launchState(checks);

    return NextResponse.json({
      ok: status !== 'blocked',
      source: 'post-launch-health',
      mode: 'read-only',
      productSlug,
      locationSlug,
      status,
      score: healthScore(checks),
      summary,
      checks,
      nextActions: checks.filter((item) => item.level !== 'ok').map((item) => ({ id: item.id, label: item.label, action: item.action || item.detail, href: item.href, level: item.level })),
      upstream: {
        finalBlockers: { ok: finalBlockers.ok, error: finalBlockers.error, launchStatus: finalPayload.launchStatus, confidence: finalPayload.confidence, summary: finalPayload.summary || null },
        firstLiveOrderMonitor: { ok: liveOrders.ok, error: liveOrders.error, launchStatus: livePayload.launchStatus, summary: livePayload.summary || null },
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'post-launch-health', error: error instanceof Error ? error.message : 'Post-launch health check failed.' }, { status: 500 });
  }
}
