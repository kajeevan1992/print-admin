import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

 type CheckStatus = 'pass' | 'warn' | 'fail';
 type ReadinessCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };

function clean(value: unknown) { return String(value || '').trim(); }
function appBase(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }
function hostName(value: string) { try { return new URL(value).hostname.toLowerCase(); } catch { return value.replace(/^https?:\/\//, '').split('/')[0].toLowerCase(); } }
function envList(...keys: string[]) { return keys.flatMap((key) => clean(process.env[key]).split(',')).map((value) => value.trim().replace(/\/$/, '')).filter(Boolean); }
function isLocalOrPreview(value: string) { const host = hostName(value); return !host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('sslip.io') || host.endsWith('.vercel.app'); }
function envFlag(name: string) { return Boolean(clean(process.env[name])); }
function booleanEnv(name: string) { return clean(process.env[name]).toLowerCase() === 'true'; }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Pragma: 'no-cache', 'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet', 'Referrer-Policy': 'no-referrer' } }); }

function publicUrlCandidates(request: Request) {
  return [clean(process.env.NEXT_PUBLIC_APP_URL), clean(process.env.NEXT_PUBLIC_SITE_URL), clean(process.env.APP_URL), clean(process.env.SITE_URL), clean(process.env.NEXT_PUBLIC_STOREFRONT_URL), clean(process.env.STOREFRONT_URL), clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${clean(process.env.VERCEL_PROJECT_PRODUCTION_URL)}` : '', appBase(request)].filter(Boolean).map((value) => value.replace(/\/$/, ''));
}

async function loadJson(request: Request, path: string) {
  const headers = new Headers();
  for (const key of ['cookie', 'authorization', 'x-tenant-id', 'x-site-id', 'x-database-connection-id']) { const value = request.headers.get(key); if (value) headers.set(key, value); }
  const response = await fetch(`${appBase(request)}${path}`, { cache: 'no-store', headers });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok && payload?.ok !== false, status: response.status, payload };
}
function summarize(checks: ReadinessCheck[]) { return { total: checks.length, pass: checks.filter((check) => check.status === 'pass').length, warn: checks.filter((check) => check.status === 'warn').length, fail: checks.filter((check) => check.status === 'fail').length }; }
function groupCounts(checks: ReadinessCheck[]) { const groups: Record<string, ReturnType<typeof summarize>> = {}; for (const check of checks) { groups[check.group] ||= { total: 0, pass: 0, warn: 0, fail: 0 }; groups[check.group].total += 1; groups[check.group][check.status] += 1; } return groups; }

export async function GET(request: Request) {
  try {
    const [stripe, email] = await Promise.all([loadJson(request, '/api/internal/payments/stripe/status'), loadJson(request, '/api/internal/email/status')]);
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
    const production = nodeEnv === 'production';
    const nodeMajor = Number(process.version.replace(/^v/, '').split('.')[0] || 0);
    const databaseHost = hostName(clean(process.env.DATABASE_URL));
    const databaseLooksLocal = !databaseHost || databaseHost.includes('localhost') || databaseHost.includes('127.0.0.1');

    checks.push({ id: 'stripe-status-endpoint', group: 'Payments', label: 'Stripe launch status endpoint loads', status: stripe.ok ? 'pass' : 'fail', detail: stripe.ok ? 'Stripe launch status endpoint responded successfully.' : `Stripe launch status failed with HTTP ${stripe.status}.`, action: stripe.ok ? 'No action needed.' : 'Open Stripe status and repair the payment configuration endpoint.', href: '/payment-checkout-qa' });
    checks.push({ id: 'stripe-live-ready', group: 'Payments', label: 'Stripe live payments are configured', status: stripeReady && stripeMode === 'live' ? 'pass' : stripeReady ? 'warn' : 'fail', detail: stripeReady && stripeMode === 'live' ? 'Stripe secret key, publishable key and webhook secret are configured for live mode.' : stripeReady ? `Stripe is configured but appears to be in ${stripeMode} mode. This is acceptable for testing, not public launch.` : 'Stripe is missing one or more required live payment settings.', action: stripeReady && stripeMode === 'live' ? 'Run a small live payment test before public launch.' : 'Set live Stripe keys and webhook signing secret, then run a controlled payment.', href: '/payment-checkout-qa', data: { mode: stripeMode, checks: stripeChecks.map((check: any) => ({ key: check.key, ok: Boolean(check.ok), value: check.value || undefined })) } });
    checks.push({ id: 'stripe-webhook-events', group: 'Payments', label: 'Stripe webhook events have been recorded', status: Number(stripePayload?.recentWebhookEvents?.length || 0) > 0 ? 'pass' : 'warn', detail: Number(stripePayload?.recentWebhookEvents?.length || 0) > 0 ? 'Recent Stripe webhook events are visible.' : 'No recent webhook events are recorded yet.', action: 'Run a checkout test and confirm completed/payment events are recorded.', href: '/payment-checkout-qa' });
    checks.push({ id: 'payment-token-secret', group: 'Payments', label: 'Dedicated payment-return signing secret exists', status: envFlag('STOREFRONT_PAYMENT_TOKEN_SECRET') ? 'pass' : 'fail', detail: envFlag('STOREFRONT_PAYMENT_TOKEN_SECRET') ? 'Dedicated storefront payment return/retry signing material is configured.' : 'STOREFRONT_PAYMENT_TOKEN_SECRET is missing.', action: 'Set a dedicated long random STOREFRONT_PAYMENT_TOKEN_SECRET.', href: '/credentials' });
    checks.push({ id: 'unsigned-webhooks', group: 'Payments', label: 'Unsigned webhooks are disabled', status: production && booleanEnv('ALLOW_UNSIGNED_STRIPE_WEBHOOKS') ? 'fail' : 'pass', detail: production && booleanEnv('ALLOW_UNSIGNED_STRIPE_WEBHOOKS') ? 'Unsigned Stripe webhooks are enabled in production.' : 'Production rejects unsigned Stripe webhooks.', action: 'Keep ALLOW_UNSIGNED_STRIPE_WEBHOOKS=false in production.', href: '/credentials' });

    checks.push({ id: 'email-status-endpoint', group: 'Email', label: 'Email launch status endpoint loads', status: email.ok ? 'pass' : 'fail', detail: email.ok ? 'Email status endpoint responded successfully.' : `Email status failed with HTTP ${email.status}.`, action: email.ok ? 'No action needed.' : 'Repair email settings/outbox status.', href: '/email-outbox' });
    checks.push({ id: 'smtp-ready', group: 'Email', label: 'SMTP and email outbox are launch-ready', status: emailReady ? 'pass' : 'fail', detail: emailReady ? 'SMTP is configured and no failed/misconfigured emails are blocking launch.' : 'SMTP is missing or the outbox contains blocking failures.', action: emailReady ? 'Send a real message and confirm SPF, DKIM, DMARC and inbox placement.' : 'Configure SMTP and clear failed/misconfigured email records.', href: '/email-outbox', data: { summary: emailPayload.summary || {}, smtp: { configured: Boolean(emailPayload?.smtp?.configured), from: emailPayload?.smtp?.from || '', source: emailPayload?.smtp?.source || '' }, checks: emailChecks.map((check: any) => ({ key: check.key, ok: Boolean(check.ok), value: check.value || undefined })) } });

    checks.push({ id: 'public-domain-configured', group: 'Domain and URL', label: 'Production public URL/domain is configured', status: hasPublicDomain && !hasPreviewPrimary ? 'pass' : hasPublicDomain ? 'warn' : 'fail', detail: hasPublicDomain && !hasPreviewPrimary ? `Primary public URL appears production-ready: ${primaryUrl}` : hasPublicDomain ? `A production-like URL exists, but the primary URL is preview/local: ${primaryUrl}` : 'No production-like public domain URL was detected.', action: 'Set final HOLO admin/storefront HTTPS URLs and confirm payment return URLs.', href: '/store-domains', data: { primaryUrl, urls } });
    checks.push({ id: 'cors-origin-review', group: 'Domain and URL', label: 'Storefront CORS origins are production-safe', status: production && localOrigins.length ? 'fail' : localOrigins.length || !origins.length ? 'warn' : 'pass', detail: localOrigins.length ? `${localOrigins.length} local/preview origins are configured.` : origins.length ? 'Explicit storefront origins do not look local or preview-only.' : 'No explicit storefront/CORS origins were detected.', action: localOrigins.length ? 'Remove localhost, Vercel preview and IP/sslip origins from production.' : 'Confirm only intended HOLO domains are allowed.', href: '/credentials', data: { origins, localOrigins } });

    checks.push({ id: 'production-runtime', group: 'Runtime', label: 'Runtime is production-oriented', status: production ? 'pass' : 'warn', detail: `NODE_ENV=${nodeEnv}${vercelEnv ? `, VERCEL_ENV=${vercelEnv}` : ''}.`, action: production ? 'No action needed.' : 'Confirm this is a production build before public traffic.', href: '/launch-command-centre', data: { nodeEnv, vercelEnv } });
    checks.push({ id: 'node-lts', group: 'Runtime', label: 'Node 22 LTS is active', status: nodeMajor === 22 ? 'pass' : production ? 'fail' : 'warn', detail: `Runtime reports ${process.version}. The application and CI are pinned to Node 22 LTS.`, action: nodeMajor === 22 ? 'No action needed.' : 'Set the deployment runtime to Node 22 LTS and redeploy.', href: '/live-environment-readiness', data: { version: process.version } });
    checks.push({ id: 'development-seed-disabled', group: 'Runtime', label: 'Development seed is disabled in production', status: production && booleanEnv('ALLOW_PRODUCTION_DEV_SEED') ? 'fail' : 'pass', detail: production && booleanEnv('ALLOW_PRODUCTION_DEV_SEED') ? 'ALLOW_PRODUCTION_DEV_SEED is enabled.' : 'The development seed remains disabled unless an explicit exceptional override and secret are provided.', action: 'Keep ALLOW_PRODUCTION_DEV_SEED=false.', href: '/credentials' });
    checks.push({ id: 'database-configured', group: 'Runtime', label: 'Production database is configured', status: !envFlag('DATABASE_URL') ? 'fail' : production && databaseLooksLocal ? 'fail' : databaseLooksLocal ? 'warn' : 'pass', detail: !envFlag('DATABASE_URL') ? 'DATABASE_URL is missing.' : databaseLooksLocal ? 'DATABASE_URL appears to point to a local host.' : 'DATABASE_URL points to a non-local database host.', action: 'Use the backup-enabled production PostgreSQL database and perform a restore drill.', href: '/data-continuity' });

    checks.push({ id: 'mfa-encryption-key', group: 'Secrets', label: 'Dedicated customer MFA encryption key exists', status: envFlag('CUSTOMER_MFA_ENCRYPTION_KEY') ? 'pass' : 'fail', detail: envFlag('CUSTOMER_MFA_ENCRYPTION_KEY') ? 'Stable dedicated MFA encryption material is configured.' : 'CUSTOMER_MFA_ENCRYPTION_KEY is missing and the deployment may fall back to unrelated secret material.', action: 'Set a stable long random CUSTOMER_MFA_ENCRYPTION_KEY before enrolling customers.', href: '/credentials' });
    checks.push({ id: 'secret-presence', group: 'Secrets', label: 'Required secret categories are present', status: envFlag('STRIPE_SECRET_KEY') && envFlag('STRIPE_WEBHOOK_SECRET') && envFlag('STOREFRONT_PAYMENT_TOKEN_SECRET') && envFlag('CUSTOMER_MFA_ENCRYPTION_KEY') && (envFlag('SMTP_USER') || envFlag('SMTP_HOST')) ? 'pass' : 'fail', detail: 'Checks only secret presence; values are never returned.', action: 'Confirm Stripe, payment signing, MFA encryption and SMTP secret categories in production.', href: '/credentials', data: { stripeSecret: envFlag('STRIPE_SECRET_KEY'), stripeWebhookSecret: envFlag('STRIPE_WEBHOOK_SECRET'), paymentTokenSecret: envFlag('STOREFRONT_PAYMENT_TOKEN_SECRET'), mfaEncryptionKey: envFlag('CUSTOMER_MFA_ENCRYPTION_KEY'), smtpUserOrHost: envFlag('SMTP_USER') || envFlag('SMTP_HOST') } });

    const summary = summarize(checks);
    const hardBlockers = checks.filter((check) => check.status === 'fail');
    const reviewItems = checks.filter((check) => check.status === 'warn');
    return json({ ok: hardBlockers.length === 0, source: 'live-environment-readiness', mode: 'read-only', launchStatus: hardBlockers.length ? 'blocked' : reviewItems.length ? 'review' : 'ready', readyForPublicLaunch: hardBlockers.length === 0 && reviewItems.length === 0, summary, groups: groupCounts(checks), hardBlockers, reviewItems, checks, upstream: { stripe: { ok: stripe.ok, mode: stripeMode, readyForLivePayments: stripeReady, webhookUrl: stripePayload.webhookUrl || '' }, email: { ok: email.ok, readyForLaunchEmails: emailReady, summary: emailPayload.summary || null } }, generatedAt: new Date().toISOString() });
  } catch (error) {
    return json({ ok: false, source: 'live-environment-readiness', error: error instanceof Error ? error.message : 'Live environment readiness failed.' }, 500);
  }
}
