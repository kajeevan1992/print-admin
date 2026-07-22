import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { hasDatabaseUrl } from '@/lib/api/db-env';
import { seedTenantAndProducts } from '@/lib/seed/dev-seed';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function clean(value: unknown) { return String(value || '').trim(); }
function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function json(data: unknown, status: number) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const production = process.env.NODE_ENV === 'production';
    if (production) {
      const explicitlyAllowed = clean(process.env.ALLOW_PRODUCTION_DEV_SEED).toLowerCase() === 'true';
      const configuredSecret = clean(process.env.DEV_SEED_SECRET);
      const suppliedSecret = clean(request.headers.get('x-dev-seed-secret'));
      if (!explicitlyAllowed || configuredSecret.length < 32 || !suppliedSecret || !secureEqual(configuredSecret, suppliedSecret)) {
        return json({ ok: false, error: { code: 'DEV_SEED_DISABLED', message: 'Development seeding is disabled in production.' } }, 404);
      }
    }

    if (!hasDatabaseUrl()) {
      return json({ ok: false, error: { code: 'DATABASE_NOT_CONFIGURED', message: 'DATABASE_URL is not configured.' } }, 503);
    }

    const result = await seedTenantAndProducts();
    return json({ ok: true, data: result }, 200);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Development seed failed.';
    const status = /admin session required/i.test(message) ? 401 : /super admin/i.test(message) ? 403 : 500;
    return json({ ok: false, error: { code: status === 401 ? 'ADMIN_SESSION_REQUIRED' : status === 403 ? 'SUPER_ADMIN_REQUIRED' : 'DEV_SEED_FAILED', message } }, status);
  }
}
