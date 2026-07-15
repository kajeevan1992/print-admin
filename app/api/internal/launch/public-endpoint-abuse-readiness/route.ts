import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type EndpointRisk = 'low' | 'medium' | 'high';

type Check = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

type PublicEndpoint = {
  id: string;
  method: string;
  path: string;
  group: string;
  risk: EndpointRisk;
  expectedGuard: string;
  abuseRisk: string;
  ownerLink: string;
};

const PUBLIC_ENDPOINTS: PublicEndpoint[] = [
  {
    id: 'checkout',
    method: 'POST',
    path: '/api/native-storefront/checkout',
    group: 'Checkout',
    risk: 'high',
    expectedGuard: 'Server-side price/VAT recalculation, pre-payment artwork gate, Stripe session creation, and payment webhook sync.',
    abuseRisk: 'Checkout can be spammed to create abandoned orders, Stripe sessions, artwork uploads and admin notifications.',
    ownerLink: '/payment-checkout-qa',
  },
  {
    id: 'order-status',
    method: 'GET',
    path: '/api/native-storefront/order-status',
    group: 'Customer tracking',
    risk: 'medium',
    expectedGuard: 'Requires order id and matching customer email before returning customer-safe order status.',
    abuseRisk: 'Attackers may brute-force order numbers or enumerate customer order states without throttling.',
    ownerLink: '/track-order',
  },
  {
    id: 'proof-action',
    method: 'POST',
    path: '/api/native-storefront/proof-action',
    group: 'Proof approval',
    risk: 'high',
    expectedGuard: 'Requires customer email, open proof state, current proof token and current proof version.',
    abuseRisk: 'Proof approval/revision endpoint changes production state and must resist repeated/automated attempts.',
    ownerLink: '/proof-action',
  },
  {
    id: 'artwork-revision',
    method: 'POST',
    path: '/api/native-storefront/artwork-revision',
    group: 'Customer upload',
    risk: 'high',
    expectedGuard: 'Requires order id, customer email, matching order email and an uploaded file.',
    abuseRisk: 'File upload endpoints can be abused for storage, bandwidth and preflight processing load.',
    ownerLink: '/storefront/upload-artwork',
  },
  {
    id: 'design-brief',
    method: 'POST',
    path: '/api/native-storefront/design-brief',
    group: 'Design help',
    risk: 'medium',
    expectedGuard: 'Requires order/customer context before saving customer design details.',
    abuseRisk: 'Design brief forms can be spammed and create staff workload or email noise.',
    ownerLink: '/design-brief',
  },
  {
    id: 'payment-return',
    method: 'GET/POST',
    path: '/api/native-storefront/payment-return',
    group: 'Payment return',
    risk: 'medium',
    expectedGuard: 'Success path requires Stripe session id; cancel path requires order id.',
    abuseRisk: 'Repeated return-sync calls can cause noisy payment/status reads if not throttled.',
    ownerLink: '/payment-success',
  },
  {
    id: 'storefront-price',
    method: 'POST',
    path: '/api/internal/storefront/price',
    group: 'Storefront pricing',
    risk: 'medium',
    expectedGuard: 'Public-by-design storefront pricing endpoint should calculate server-side and never trust client totals.',
    abuseRisk: 'Pricing endpoints can be scraped or hammered by bots, causing DB/catalog load.',
    ownerLink: '/storefront-content-readiness',
  },
  {
    id: 'storefront-product',
    method: 'GET',
    path: '/api/internal/storefront/product',
    group: 'Storefront catalogue',
    risk: 'low',
    expectedGuard: 'Public-by-design product contract endpoint should return only customer-safe product data.',
    abuseRisk: 'Product contract endpoints can be crawled heavily; cache/rate policy should be clear.',
    ownerLink: '/storefront-content-readiness',
  },
];

function truthy(value: unknown) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
}

function envPresent(...keys: string[]) {
  return keys.some((key) => Boolean(String(process.env[key] || '').trim()));
}

function detectControls() {
  const appRateLimit = truthy(process.env.RATE_LIMIT_ENABLED) || truthy(process.env.NEXT_PUBLIC_RATE_LIMIT_ENABLED) || envPresent('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_URL', 'RATE_LIMIT_REDIS_URL');
  const captcha = envPresent('TURNSTILE_SECRET_KEY', 'CLOUDFLARE_TURNSTILE_SECRET_KEY', 'RECAPTCHA_SECRET_KEY', 'HCAPTCHA_SECRET_KEY');
  const firewall = truthy(process.env.VERCEL_WAF_ENABLED) || truthy(process.env.VERCEL_FIREWALL_ENABLED) || truthy(process.env.BOT_PROTECTION_ENABLED) || envPresent('VERCEL_BOTID_SECRET');
  const uploadLimit = envPresent('MAX_ARTWORK_UPLOAD_MB', 'ARTWORK_MAX_FILE_SIZE_MB', 'MAX_UPLOAD_SIZE_MB') || truthy(process.env.ARTWORK_UPLOAD_LIMITS_ENABLED);
  const securityHeaders = truthy(process.env.SECURITY_HEADERS_ENABLED) || truthy(process.env.STRICT_TRANSPORT_SECURITY_ENABLED);
  return { appRateLimit, captcha, firewall, uploadLimit, securityHeaders };
}

function check(id: string, group: string, label: string, status: CheckStatus, detail: string, action?: string, href?: string, data?: Record<string, any>): Check {
  return { id, group, label, status, detail, action, href, data };
}

function endpointStatus(endpoint: PublicEndpoint, controls: ReturnType<typeof detectControls>): CheckStatus {
  if (controls.appRateLimit || controls.firewall) return 'pass';
  if (endpoint.risk === 'high') return 'warn';
  return 'warn';
}

function buildChecks(controls: ReturnType<typeof detectControls>) {
  const checks: Check[] = [];

  checks.push(check(
    'rate-limit-signal',
    'Global abuse controls',
    'Rate-limit signal',
    controls.appRateLimit ? 'pass' : 'warn',
    controls.appRateLimit ? 'A rate-limit storage/config signal is present.' : 'No app-level rate-limit storage/config signal was detected from env.',
    controls.appRateLimit ? 'Confirm limits are applied to checkout, proof, tracking and upload routes.' : 'Add or verify app-level rate limiting, ideally backed by Redis/KV, before full public launch.',
    '/public-endpoint-abuse-readiness',
    { envSignalsChecked: ['RATE_LIMIT_ENABLED', 'UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_URL'] },
  ));

  checks.push(check(
    'firewall-bot-signal',
    'Global abuse controls',
    'Firewall / bot protection signal',
    controls.firewall ? 'pass' : 'warn',
    controls.firewall ? 'A firewall/bot-protection signal is present.' : 'No Vercel Firewall/BotID-style signal was detected from env.',
    controls.firewall ? 'Confirm production project firewall rules are active.' : 'Enable Vercel Firewall/Bot protection or equivalent before scaling beyond soft launch.',
    '/live-environment-readiness',
  ));

  checks.push(check(
    'captcha-signal',
    'Human verification',
    'CAPTCHA / Turnstile signal',
    controls.captcha ? 'pass' : 'warn',
    controls.captcha ? 'A CAPTCHA/Turnstile secret signal is present.' : 'No CAPTCHA/Turnstile secret signal was detected.',
    controls.captcha ? 'Use human verification only on abused flows to avoid hurting checkout conversion.' : 'Keep CAPTCHA optional for soft launch, but have Turnstile/reCAPTCHA ready for design brief, proof and upload abuse.',
    '/public-endpoint-abuse-readiness',
  ));

  checks.push(check(
    'upload-limit-signal',
    'Customer upload',
    'Upload size/type limit signal',
    controls.uploadLimit ? 'pass' : 'warn',
    controls.uploadLimit ? 'Upload limit configuration signal is present.' : 'No explicit upload size limit env signal was detected.',
    controls.uploadLimit ? 'Confirm the UI and server agree on maximum upload sizes and allowed types.' : 'Confirm artwork upload size/type limits before public traffic, especially for PDFs and images.',
    '/storefront/upload-artwork',
  ));

  for (const endpoint of PUBLIC_ENDPOINTS) {
    checks.push(check(
      `endpoint-${endpoint.id}`,
      endpoint.group,
      `${endpoint.method} ${endpoint.path}`,
      endpointStatus(endpoint, controls),
      `${endpoint.expectedGuard} Abuse risk: ${endpoint.abuseRisk}`,
      controls.appRateLimit || controls.firewall ? 'Confirm this endpoint is included in the configured rate-limit/firewall policy.' : 'Add this endpoint to a rate-limit/firewall policy before full public launch.',
      endpoint.ownerLink,
      { method: endpoint.method, path: endpoint.path, risk: endpoint.risk },
    ));
  }

  checks.push(check(
    'soft-launch-policy',
    'Launch policy',
    'Soft-launch abuse policy',
    controls.appRateLimit || controls.firewall ? 'pass' : 'warn',
    controls.appRateLimit || controls.firewall ? 'A technical abuse-control signal exists; still monitor the first live orders.' : 'Soft launch can continue only with manual monitoring and low traffic while no rate-limit signal exists.',
    'Use First Live Order Monitor, Post-launch Health and email outbox checks during early live traffic.',
    '/launch-command-centre',
  ));

  return checks;
}

function summarize(checks: Check[]) {
  return {
    total: checks.length,
    pass: checks.filter((item) => item.status === 'pass').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };
}

export async function GET() {
  const startedAt = new Date().toISOString();
  const controls = detectControls();
  const checks = buildChecks(controls);
  const summary = summarize(checks);
  const launchStatus = summary.fail ? 'blocked' : summary.warn ? 'review' : 'ready';
  const nextActions = checks
    .filter((item) => item.status === 'fail' || item.status === 'warn')
    .map((item) => ({ id: item.id, group: item.group, label: item.label, status: item.status, action: item.action, href: item.href }))
    .slice(0, 20);

  return NextResponse.json({
    ok: summary.fail === 0,
    source: 'public-endpoint-abuse-readiness',
    mode: 'read-only',
    launchStatus,
    controls,
    summary,
    checks,
    endpoints: PUBLIC_ENDPOINTS,
    nextActions,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
}
