import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Status = 'pass' | 'warn' | 'fail' | 'skip';

type Check = {
  id: string;
  group: string;
  label: string;
  status: Status;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

function hasAny(names: string[]) {
  return names.some((name) => Boolean(String(process.env[name] || '').trim()));
}

function secretState(names: string[]) {
  const configured = names.filter((name) => Boolean(String(process.env[name] || '').trim()));
  return { configured: configured.length > 0, names: configured };
}

function check(id: string, group: string, label: string, status: Status, detail: string, action?: string, href?: string, data?: Record<string, any>): Check {
  return { id, group, label, status, detail, action, href, data };
}

function summary(checks: Check[]) {
  return {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
}

function launchStatus(items: Check[]) {
  if (items.some((item) => item.status === 'fail')) return 'blocked';
  if (items.some((item) => item.status === 'warn')) return 'review';
  return 'ready';
}

export async function GET() {
  const redis = secretState(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'REDIS_URL']);
  const turnstile = secretState(['TURNSTILE_SECRET_KEY', 'CLOUDFLARE_TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY']);
  const recaptcha = secretState(['RECAPTCHA_SECRET_KEY', 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'GOOGLE_RECAPTCHA_SECRET_KEY']);
  const abuseContact = secretState(['SECURITY_CONTACT_EMAIL', 'ADMIN_EMAIL', 'ORDER_NOTIFICATION_EMAIL', 'HOLO_PRINT_ADMIN_EMAIL']);
  const botChallengeConfigured = turnstile.configured || recaptcha.configured;
  const rateLimitInfraConfigured = redis.configured;

  const checks: Check[] = [
    check(
      'rate-limit-infrastructure',
      'Rate limiting',
      'Rate-limit storage configured',
      rateLimitInfraConfigured ? 'pass' : 'fail',
      rateLimitInfraConfigured
        ? 'A Redis/KV-style backing store appears configured for future durable rate limits.'
        : 'No Redis/KV rate-limit backing store was detected in environment variables. Public write endpoints can be spammed until a durable limiter is added.',
      rateLimitInfraConfigured ? 'Keep rate-limit secrets private and verify limits in production.' : 'Add Upstash Redis/Vercel KV/Redis credentials and implement per-IP/order/email limits on public write endpoints.',
      '/live-environment-readiness',
      { configuredNames: redis.names, checkedNames: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'REDIS_URL'] }
    ),
    check(
      'bot-challenge-provider',
      'Bot protection',
      'Bot challenge provider configured',
      botChallengeConfigured ? 'pass' : 'warn',
      botChallengeConfigured
        ? 'Turnstile or reCAPTCHA-style environment variables are present.'
        : 'No Turnstile/reCAPTCHA-style challenge secrets were detected. This is acceptable for controlled soft launch, but risky for public upload/contact/payment flows.',
      botChallengeConfigured ? 'Use challenge only where friction is acceptable.' : 'Add Cloudflare Turnstile or reCAPTCHA to upload/design/contact-style public forms before full public launch.',
      '/customer-public-flow-audit',
      { turnstile: turnstile.names, recaptcha: recaptcha.names }
    ),
    check(
      'checkout-abuse-risk',
      'Public write endpoints',
      'Checkout creation spam risk',
      rateLimitInfraConfigured ? 'warn' : 'fail',
      'Checkout creates orders/payment sessions and should be protected from repeated anonymous submissions.',
      rateLimitInfraConfigured ? 'Apply limits by IP + email + tenant/store.' : 'Before public launch, add rate limits to /api/native-storefront/checkout and monitor failed checkout spikes.',
      '/payment-checkout-qa'
    ),
    check(
      'artwork-upload-abuse-risk',
      'Public write endpoints',
      'Artwork upload spam risk',
      rateLimitInfraConfigured && botChallengeConfigured ? 'warn' : 'fail',
      'Artwork upload/revision endpoints accept files, so they need stricter abuse controls than read-only customer status endpoints.',
      'Add per-IP/order/email limits, file-size/type enforcement, and optional bot challenge for repeated upload attempts.',
      '/customer-public-flow-audit'
    ),
    check(
      'proof-action-abuse-risk',
      'Public write endpoints',
      'Proof decision replay/spam risk',
      rateLimitInfraConfigured ? 'warn' : 'fail',
      'Proof actions are protected by email + current proof token/version, but repeated POST attempts should still be throttled.',
      'Apply low-volume limits by order/proof token/IP and log repeated failed proof attempts.',
      '/customer-public-flow-audit'
    ),
    check(
      'track-order-read-risk',
      'Public read endpoints',
      'Track-order enumeration risk',
      rateLimitInfraConfigured ? 'warn' : 'fail',
      'Track Order requires order + email, but repeated guessing should be throttled to prevent enumeration attempts.',
      'Add rate limits by IP and failed order/email match count.',
      '/customer-public-flow-audit'
    ),
    check(
      'payment-return-risk',
      'Payment callbacks',
      'Payment return replay risk',
      'warn',
      'Payment return sync should stay idempotent and should rely on Stripe session lookup/server-side payment state rather than trusting query parameters.',
      'Keep Stripe webhook as source of truth and monitor repeated payment-return calls.',
      '/payment-checkout-qa'
    ),
    check(
      'cors-public-apis',
      'CORS',
      'Public API CORS review',
      'warn',
      'Some customer APIs intentionally use broad CORS so hosted themes/customer pages can call them. This is acceptable only when each route validates order/email/token and write endpoints are throttled.',
      'Keep customer APIs narrow where possible and avoid exposing admin APIs through public CORS.',
      '/launch-security-access-audit'
    ),
    check(
      'security-contact',
      'Operations',
      'Abuse contact configured',
      abuseContact.configured ? 'pass' : 'warn',
      abuseContact.configured ? 'A security/admin contact email appears configured.' : 'No security/admin contact email was detected for abuse alerts and customer escalation.',
      abuseContact.configured ? 'Use this address in monitoring and alerting.' : 'Set SECURITY_CONTACT_EMAIL or confirm ADMIN_EMAIL/ORDER_NOTIFICATION_EMAIL before public launch.',
      '/live-environment-readiness',
      { configuredNames: abuseContact.names }
    ),
    check(
      'soft-launch-manual-monitoring',
      'Soft launch fallback',
      'Manual monitoring available',
      'pass',
      'First Live Order Monitor and Post-launch Health exist, so controlled soft launch can be monitored manually even before automated rate limiting is implemented.',
      'During soft launch, keep order volume small and watch monitors after every live order.',
      '/first-live-order-monitor'
    ),
  ];

  const totals = summary(checks);
  const status = launchStatus(checks);
  return NextResponse.json({
    ok: totals.fail === 0,
    source: 'public-endpoint-abuse-audit',
    mode: 'read-only',
    launchStatus: status,
    summary: totals,
    checks,
    nextActions: checks.filter((item) => item.status === 'fail' || item.status === 'warn').map((item) => ({ id: item.id, label: item.label, status: item.status, action: item.action, href: item.href })).slice(0, 12),
    generatedAt: new Date().toISOString(),
  });
}
