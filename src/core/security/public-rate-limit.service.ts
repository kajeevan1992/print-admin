type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  identifier?: string;
};

type Bucket = { count: number; resetAt: number };
type RateLimitResult = {
  scope: string;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  limited: boolean;
  enforced: boolean;
  mode: 'monitor' | 'enforce';
  headers: Record<string, string>;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function clean(value: unknown) {
  return String(value || '').trim();
}

function normal(value: unknown) {
  return clean(value).toLowerCase();
}

function firstIp(value: string | null) {
  return clean(value).split(',')[0]?.trim() || '';
}

function clientIp(request: Request) {
  const headers = request.headers;
  return firstIp(headers.get('cf-connecting-ip')) ||
    firstIp(headers.get('x-real-ip')) ||
    firstIp(headers.get('x-forwarded-for')) ||
    firstIp(headers.get('x-vercel-forwarded-for')) ||
    'unknown-ip';
}

function mode(): 'monitor' | 'enforce' {
  const value = normal(process.env.PUBLIC_RATE_LIMIT_MODE || process.env.NEXT_PUBLIC_ENDPOINT_RATE_LIMIT_MODE || process.env.PUBLIC_ENDPOINT_RATE_LIMIT_MODE);
  return value === 'enforce' || value === 'on' || value === 'true' ? 'enforce' : 'monitor';
}

function cleanup(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now || buckets.size > MAX_BUCKETS) buckets.delete(key);
  }
}

function hashish(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
}

export function publicRateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const userAgent = clean(request.headers.get('user-agent')).slice(0, 80) || 'unknown-agent';
  const identifier = clean(options.identifier).toLowerCase();
  const rawKey = [options.scope, clientIp(request), identifier, userAgent].filter(Boolean).join('|');
  const key = `${options.scope}:${hashish(rawKey)}`;
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + options.windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);
  const remaining = Math.max(0, options.limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const limited = bucket.count > options.limit;
  const currentMode = mode();
  const enforced = currentMode === 'enforce' && limited;
  return {
    scope: options.scope,
    key,
    limit: options.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
    limited,
    enforced,
    mode: currentMode,
    headers: {
      'X-RateLimit-Limit': String(options.limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1000)),
      'X-RateLimit-Mode': currentMode,
      ...(limited ? { 'Retry-After': String(retryAfterSeconds) } : {}),
    },
  };
}

export function rateLimitPayload(result: RateLimitResult) {
  return {
    ok: false,
    error: 'Too many requests. Please wait a moment and try again.',
    rateLimit: {
      scope: result.scope,
      limit: result.limit,
      retryAfterSeconds: result.retryAfterSeconds,
      mode: result.mode,
    },
  };
}
