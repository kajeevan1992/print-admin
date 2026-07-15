import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail';
type ReadinessCheck = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function appBase(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function hostName(value: string) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return value.replace(/^https?:\/\//, '').split('/')[0].toLowerCase(); }
}

function envList(...keys: string[]) {
  return keys
    .flatMap((key) => clean(process.env[key]).split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isLocalOrPreview(value: string) {
  const host = hostName(value);
  return !host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('sslip.io') || host.endsWith('.vercel.app');
}

function publicUrlCandidates(request: Request) {
  return [
    clean(process.env.NEXT_PUBLIC_APP_URL),
    clean(process.env.NEXT_PUBLIC_SITE_URL),
    clean(process.env.APP_URL),
    clean(process.env.SITE_URL),
    clean(process.env.NEXT_PUBLIC_STOREFRONT_URL),
    clean(process.env.STOREFRONT_URL),
    clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${clean(process.env.VERCEL_PROJECT_PRODUCTION_URL)}` : '',
    appBase(request),
  ].filter(Boolean).map((value) => value.replace(/\/$/, ''));
}

async function loadJson(request: Request, path: string) {
  const headers = new Headers();
  for (const key of ['cookie', 'authorization', 'x-tenant-id', 'x-site-id', 'x-database-connection-id']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const response = await fetch(`${appBase(request)}${path}`, { cache: 'no-store', headers });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok && payload?.ok !== false, status: response.status, payload };
}

function summarize(checks: ReadinessCheck[]) {
  return {
    total: checks.length,
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
  };
}

function groupCounts(checks: ReadinessCheck[]) {
  const groups: Record<string, ReturnType<typeof summarize>> = {};
  for (const check of checks) {
    groups[check.group] ||= { total: 0, pass: 0, warn: 0, fail: 0 };
    groups[check.group].total += 1;
    groups[check.group][check.status] += 1;
  }
  return groups;
}

function envFlag(name: string) {
  return Boolean(clean(process.env[name]));
}

export async function GET(request: Request) {
  try {
    const [stripe, email] = await Promise.all([
      loadJson(request, '/api/internal/payments/stripe/status'),
      loadJson(request, '/api/internal/email/status'),
    ]);

    const checks: ReadinessCheck[] = [];
    const stripePayload = stripe.payload || {};
    const emailPayload = email.payload || {};
    const stripeMode = clean(stripePayload.mode) || 'unknown';
    const stripeChecks = Array.isArray(stripePayload.checks) ? stripePayload.checks : [];
    const emailChecks = Array.isArray(emailPayload.checks) ? emailPayload.checks : [];
    const stripeReady = Boolean(stripePayload.readyForLivePayments);
    const emailReady = Boolean(emailPayload.readyForLaunchEmails);
    const urls = publicUrlCandidates(request);
    const primaryUrl = urls[0] || appBase(request);
    const origins = envList('CORS_ORIGIN', 'CORS_ORIGINS', 'ALLOWED_ORIGINS', 'STOREFRONT_URL', 'NEXT_PUBLIC_STOREFRONT_URL');
    const localOrigins = origins.filter(isLocalOrPreview);
    const hasPublicDomain = urls.some((value) => !isLocalOrPreview(value));
    const hasPreviewPrimary = isLocalOrPreview(primaryUrl);
    const nodeEnv = clean(process.env.NODE_ENV) || 'unknown';
    const vercelEnv = clean(process.env.VERCEL_ENV) || '';

    checks.push({
      id: 'stripe-status-endpoint',
      group: 'Payments',
      label: 'Stripe launch status endpoint loads',
      status: stripe.ok ? 'pass' : 'fail',
      detail: stripe.ok ? 'Stripe launch status endpoint responded successfully.' : `Stripe launch status failed with HTTP ${stripe.status}.`,
      action: stripe.ok ? 'No action needed.' : 'Open Stripe status and repair the payment configuration endpoint.',
      href: '/payment-checkout-qa',
    });

    checks.push({
      id: 'stripe-live-ready',
      group: 'Payments',
      label: 'Stripe live payments are configured',
      status: stripeReady && stripeMode === 'live' ? 'pass' : stripeReady ? 'warn' : 'fail',
      detail: stripeReady && stripeMode === 'live'
        ? 'Stripe secret key, publishable key and webhook secret are configured for live mode.'
        : stripeReady
          ? `Stripe is configured but appears to be in ${stripeMode} mode. This is acceptable for testing, not public launch.`
          : 'Stripe is missing one or more required live payment settings.',
      action: stripeReady && stripeMode === 'live' ? 'Run a small live payment test before public launch.' : 'Set live Stripe keys and webhook signing secret in production environment variables, then run a live payment test.',
      href: '/payment-checkout-qa',
      data: { mode: stripeMode, checks: stripeChecks.map((check: any) => ({ key: check.key, ok: Boolean(check.ok), value: check.value || undefined })) },
    });

    checks.push({
      id: 'stripe-webhook-events',
      group: 'Payments',
      label: 'Stripe webhook events have been recorded',
      status: Number(stripePayload?.recentWebhookEvents?.length || 0) > 0 ? 'pass' : 'warn',
      detail: Number(stripePayload?.recentWebhookEvents?.length || 0) > 0 ? 'Recent Stripe webhook events are visible.' : 'No recent webhook events are recorded yet. This is expected before a live/test payment, but must be proven before public launch.',
      action: 'Run a Stripe checkout test and confirm checkout.session.completed and payment_intent.succeeded are recorded.',
      href: '/payment-checkout-qa',
    });

    checks.push({
      id: 'email-status-endpoint',
      group: 'Email',
      label: 'Email launch status endpoint loads',
      status: email.ok ? 'pass' : 'fail',
      detail: email.ok ? 'Email status endpoint responded successfully.' : `Email status failed with HTTP ${email.status}.`,
      action: email.ok ? 'No action needed.' : 'Open email settings/outbox and repair email status endpoint.',
      href: '/email-outbox',
    });

    checks.push({
      id: 'smtp-ready',
      group: 'Email',
      label: 'SMTP and email outbox are launch-ready',
      status: emailReady ? 'pass' : 'fail',
      detail: emailReady ? 'SMTP is configured and no failed/misconfigured emails are blocking launch.' : 'SMTP is missing or email outbox has failed/misconfigured records.',
      action: emailReady ? 'Send a real test email and confirm inbox delivery, SPF/DKIM/DMARC and spam placement.' : 'Configure SMTP/email settings and clear failed or misconfigured email records before launch.',
      href: '/email-outbox',
      data: { summary: emailPayload.summary || {}, smtp: { configured: Boolean(emailPayload?.smtp?.configured), from: emailPayload?.smtp?.from || '', source: emailPayload?.smtp?.source || '' }, checks: emailChecks.map((check: any) => ({ key: check.key, ok: Boolean(check.ok), value: check.value || undefined })) },
    });

    checks.push({
      id: 'public-domain-configured',
      group: 'Domain and URL',
      label: 'Production public URL/domain is configured',
      status: hasPublicDomain && !hasPreviewPrimary ? 'pass' : hasPublicDomain ? 'warn' : 'fail',
      detail: hasPublicDomain && !hasPreviewPrimary
        ? `Primary public URL appears production-ready: ${primaryUrl}`
        : hasPublicDomain
          ? `A production-like URL exists, but the current/primary URL appears to be preview/local: ${primaryUrl}`
          : 'No production-like public domain URL was detected in environment variables.',
      action: 'Set NEXT_PUBLIC_APP_URL/SITE_URL/STOREFRONT_URL to the real launch domain and confirm payment return URLs use it.',
      href: '/store-domains',
      data: { primaryUrl, urls },
    });

    checks.push({
      id: 'cors-origin-review',
      group: 'Domain and URL',
      label: 'Storefront CORS origins are production-safe',
      status: localOrigins.length ? 'warn' : origins.length ? 'pass' : 'warn',
      detail: localOrigins.length ? `${localOrigins.length} local/preview origins are still configured.` : origins.length ? 'Configured CORS/storefront origins do not look local or preview-only.' : 'No explicit storefront/CORS origins were detected.',
      action: localOrigins.length ? 'Remove old localhost, preview or IP origins from production env unless still required.' : 'Confirm only intended storefront/customer domains are allowed.',
      href: '/credentials',
      data: { origins, localOrigins },
    });

    checks.push({
      id: 'production-runtime',
      group: 'Runtime',
      label: 'Runtime is production-oriented',
      status: nodeEnv === 'production' ? 'pass' : 'warn',
      detail: `NODE_ENV=${nodeEnv}${vercelEnv ? `, VERCEL_ENV=${vercelEnv}` : ''}.`,
      action: nodeEnv === 'production' ? 'No action needed.' : 'Confirm this deployment is a production build before sending public traffic.',
      href: '/launch-command-centre',
      data: { nodeEnv, vercelEnv },
    });

    checks.push({
      id: 'secret-presence',
      group: 'Secrets',
      label: 'Required secret categories are present',
      status: envFlag('STRIPE_SECRET_KEY') && envFlag('STRIPE_WEBHOOK_SECRET') && (envFlag('SMTP_USER') || envFlag('SMTP_HOST')) ? 'pass' : 'fail',
      detail: 'Checks only presence of required secret categories; secret values are never returned.',
      action: 'Confirm Stripe secret, Stripe webhook secret and SMTP/email secrets exist in the production environment.',
      href: '/credentials',
      data: {
        stripeSecret: envFlag('STRIPE_SECRET_KEY'),
        stripeWebhookSecret: envFlag('STRIPE_WEBHOOK_SECRET'),
        smtpUserOrHost: envFlag('SMTP_USER') || envFlag('SMTP_HOST'),
      },
    });

    const summary = summarize(checks);
    const hardBlockers = checks.filter((check) => check.status === 'fail');
    const reviewItems = checks.filter((check) => check.status === 'warn');
    return NextResponse.json({
      ok: hardBlockers.length === 0,
      source: 'live-environment-readiness',
      mode: 'read-only',
      launchStatus: hardBlockers.length ? 'blocked' : reviewItems.length ? 'review' : 'ready',
      readyForPublicLaunch: hardBlockers.length === 0 && reviewItems.length === 0,
      summary,
      groups: groupCounts(checks),
      hardBlockers,
      reviewItems,
      checks,
      upstream: {
        stripe: { ok: stripe.ok, mode: stripeMode, readyForLivePayments: stripeReady, webhookUrl: stripePayload.webhookUrl || '' },
        email: { ok: email.ok, readyForLaunchEmails: emailReady, summary: emailPayload.summary || null },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'live-environment-readiness', error: error instanceof Error ? error.message : 'Live environment readiness failed.' }, { status: 500 });
  }
}
