import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HealthCheck = {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  checkedAt: string;
};

function now() {
  return new Date().toISOString();
}

function envStatus(name: string, label: string): HealthCheck {
  const present = Boolean(process.env[name]);
  return {
    key: name.toLowerCase(),
    label,
    status: present ? 'ok' : 'warning',
    message: present ? `${name} is configured.` : `${name} is not configured. Some database-backed modules may use fallbacks.`,
    checkedAt: now(),
  };
}

export async function GET() {
  const checks: HealthCheck[] = [
    envStatus('DATABASE_URL', 'Platform database'),
    envStatus('TENANT_DATABASE_URL', 'Tenant database override'),
    envStatus('PLATFORM_SECRET_KEY', 'Platform secret key'),
    {
      key: 'runtime',
      label: 'Next.js runtime',
      status: 'ok',
      message: `Runtime is responding in ${process.env.NODE_ENV || 'unknown'} mode.`,
      checkedAt: now(),
    },
    {
      key: 'internal-api',
      label: 'Internal API shell',
      status: 'ok',
      message: 'Internal platform diagnostics endpoint is reachable.',
      checkedAt: now(),
    },
  ];

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.TENANT_DATABASE_URL);
  const status = checks.some((check) => check.status === 'error')
    ? 'error'
    : hasDatabaseUrl
      ? 'ok'
      : 'warning';

  return NextResponse.json({
    ok: true,
    source: 'internal-platform',
    build: 'v204',
    status,
    checkedAt: now(),
    summary: {
      total: checks.length,
      ok: checks.filter((check) => check.status === 'ok').length,
      warning: checks.filter((check) => check.status === 'warning').length,
      error: checks.filter((check) => check.status === 'error').length,
    },
    checks,
  });
}
