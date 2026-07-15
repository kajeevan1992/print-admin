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
  builtInLimiter?: boolean;
};

const PUBLIC_ENDPOINTS: PublicEndpoint[] = [
  {
    id: 'checkout',
    method: 'POST',
    path: '/api/native-storefront/checkout',
    group: 'Checkout',
    risk: 'high',
    expectedGuard: 'Server-side price/VAT recalculation, pre-payment artwork gate, Stripe session creation, payment webhook sync, and built-in monitor/enforce rate-limit guard.',
    abuseRisk: 'Checkout can be spammed to create abandoned orders, Stripe sessions, artwork uploads and admin notifications.',
    ownerLink: '/payment-checkout-qa',
    builtInLimiter: true,
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
    builtInLimiter: true,
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
    builtInLimiter: true,
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
    builtInLimiter: true,
  },
  {
    id: 'design-brief',
    method: 'GET/POST',
    path: '/api/native-storefront/design-brief',
    group: 'Design help',
    risk: 'medium',
    expectedGuard: 'Requires order/customer context before viewing or saving customer design details.',
    abuseRisk: 'Design brief forms can be spammed and create staff workload or email noise.',
    ownerLink: '/design-brief',
    builtInLimiter: true,
  },
  {
    id: 'payment-return',
    method: 'GET/POST',
    path: '/api/native-storefront/payment-return',
    group: 'Payment return',
    risk: 'medium',
    expectedGuard: 'Success/cancel paths require Stripe session id and verify the order reference against the Stripe session.',
    abuseRisk: 'Repeated return-sync calls can cause noisy payment/status reads if not throttled.',
    ownerLink: '/payment-success',
    builtInLimiter: true,
  },
  {
    id: 'storefront-price',
    method: 'POST',
    path: '/api/internal/storefront/price',
    group: 'Storefront pricing',
    risk: 'medium',
    expectedGuard: 'Public-by-design storefront pricing endpoint calculates server-side, never trusts client totals, and has built-in monitor/enforce rate-limit guard.',
    abuseRisk: 'Pricing endpoints can be scraped or hammered by bots, causing DB/catalog load.',
    ownerLink: '/storefront-content-readiness',
    builtInLimiter: true,
  },
  {
    id: 'storefront-product',
    method: 'GET',
    path: '/api/internal/storefront/product',
    group: 'Storefront catalogue',
    risk: 'low',
    expectedGuard: 'Public-by-design product contract endpoint returns customer-safe product data and has built-in monitor/enforce rate-limit guard.',
    abuseRisk: 'Product contract endpoints can be crawled heavily; cache/rate policy should be clear.',
    ownerLink: '/storefront-content-readiness',
    builtInLimiter: true,
  },
];

function truthy(value: unknown) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
}

function envPresent(...keys: string[]) {
  return keys.some((key) => Boolean(String(process.env[key] || '').trim()));
}

function rateLimitMode() {
  const value = String(process.env.PUBLIC_RATE_LIMIT_MODE || process.env.NEXT_PUBLIC_ENDPOINT_RATE_LIMIT_MODE || process.env.PUBLIC_ENDPOINT_RATE_LIMIT_MODE || '').trim().toLowerCase();
  return value === 'enforce' || value === 'on' || value === 'true' ? 'enforce' : 'monitor';
}

function detectControls() {
  const builtInLimiter = PUBLIC_ENDPOINTS.some((endpoint) => endpoint.builtInLimiter);
  const builtInLimiterCoverage = PUBLIC_ENDPOINTS.filter((endpoint) => endpoint.builtInLimiter).length;
  const appRateLimit = builtInLimiter || truthy(process.env.RATE_LIMIT_ENABLED) || truthy(process.env.NEXT_PUBLIC_RATE_LIMIT_ENABLED) || envPresent('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_URL', 'RATE_LIMIT_REDIS_URL');
  const captcha = envPresent('TURNSTILE_SECRET_KEY', 'CLOUDFLARE_TURNSTILE_SECRET_KEY', 'RECAPTCHA_SECRET_KEY', 'HCAPTCHA_SECRET_KEY');
  const firewall = truthy(process.env.VERCEL_WAF_ENABLED) || truthy(process.env.VERCEL_FIREWALL_ENABLED) || truthy(process.env.BOT_PROTECTION_ENABLED) || envPresent('VERCEL_BOTID_SECRET');
  const uploadLimit = envPresent('MAX_ARTWORK_UPLOAD_MB', 'ARTWORK_MAX_FILE_SIZE_MB', 'MAX_UPLOAD_SIZE_MB') || truthy(process.env.ARTWORK_UPLOAD_LIMITS_ENABLED);
  const securityHeaders = truthy(process.env.SECURITY_HEADERS_ENABLED) || truthy(process.env.STRICT_TRANSPORT_SECURITY_ENABLED);
  return { appRateLimit, builtInLimiter, builtInLimiterCoverage, rateLimitMode: rateLimitMode(), captcha, firewall, uploadLimit, securityHeaders };
}

function check(id: string, group: string, label: string, status: CheckStatus, detail: string, action?: string, href?: string, data?: Record<string, any>): Check {
  return { id, group, label, status, detail, action, href, data };
}

function endpointStatus(endpoint: PublicEndpoint, controls: ReturnType<typeof detectControls>): CheckStatus {
  if (endpoint.builtInLimiter || controls.firewall) return 'pass';
  return endpoint.risk === 'high' ? 'warn' : 'warn';
}

function buildChecks(controls: ReturnType<typeof detectControls>) {
  const checks: Check[] = [];

  checks.push(check(
    'rate-limit-signal',
    'Global abuse controls',
    'Rate-limit signal',
    controls.appRateLimit ? 'pass' : 'warn',
    controls.builtInLimiter ? `Built-in public endpoint limiter is present on ${controls.builtInLimiterCoverage}/${PUBLIC_ENDPOINTS.length} tracked endpoints in ${controls.rateLimitMode} mode.` : controls.appRateLimit ? 'A rate-limit storage/config signal is present.' : 'No app-level rate-limit storage/config signal was detected from env.',
    controls.rateLimitMode === 'enforce' ? 'Enforcement mode is active; keep watching checkout/proof/upload error rates.' : 'Limiter is in monitor mode. Test live customer flows, then switch PUBLIC_RATE_LIMIT_MODE=enforce when ready.',
    '/public-endpoint-abuse-readiness',
    { envSignalsChecked: ['PUBLIC_RATE_LIMIT_MODE', 'RATE_LIMIT_ENABLED', 'UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_URL'], builtInLimiterCoverage: controls.builtInLimiterCoverage },
  ));

  checks.push(check(
    'rate-limit-enforcement-mode',
    'Global abuse controls',
    'Rate-limit enforcement mode',
    controls.rateLimitMode === 'enforce' ? 'pass' : 'warn',
    controls.rateLimitMode === 'enforce' ? 'Public endpoint limiter is enforcing 429 responses.' : 'Public endpoint limiter is currently in monitor mode and will not block customers yet.',
    controls.rateLimitMode === 'enforce' ? 'Confirm conversion and customer support are still healthy.' : 'Keep monitor mode during soft launch; enable PUBLIC_RATE_LIMIT_MODE=enforce after smoke-testing checkout, proof and upload flows.',
    '/production-smoke-test',
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
      endpoint.builtInLimiter ? 'Built-in limiter is installed. Verify monitor headers in soft launch, then enforce when ready.' : controls.firewall ? 'Confirm this endpoint is included in the configured firewall policy.' : 'Add this endpoint to a rate-limit/firewall policy before full public launch.',
      endpoint.ownerLink,
      { method: endpoint.method, path: endpoint.path, risk: endpoint.risk, builtInLimiter: Boolean(endpoint.builtInLimiter), rateLimitMode: controls.rateLimitMode },
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
