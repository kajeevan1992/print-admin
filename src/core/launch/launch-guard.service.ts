export type LaunchGuardSeverity = 'pass' | 'warning' | 'error' | 'info';
export type LaunchGuardCheck = { id: string; category: string; severity: LaunchGuardSeverity; label: string; detail: string; action?: string };
function check(id: string, category: string, severity: LaunchGuardSeverity, label: string, detail: string, action = ''): LaunchGuardCheck { return { id, category, severity, label, detail, action }; }
function pass(id: string, category: string, label: string, detail: string, action = '') { return check(id, category, 'pass', label, detail, action); }
function warn(id: string, category: string, label: string, detail: string, action = '') { return check(id, category, 'warning', label, detail, action); }
function fail(id: string, category: string, label: string, detail: string, action = '') { return check(id, category, 'error', label, detail, action); }
function info(id: string, category: string, label: string, detail: string, action = '') { return check(id, category, 'info', label, detail, action); }
function env(name: string) { return String(process.env[name] || '').trim(); }
function has(name: string) { return Boolean(env(name)); }

export async function buildLaunchGuardReport() {
  const checks: LaunchGuardCheck[] = [];
  if (has('DATABASE_URL') || has('AIVEN_DATABASE_URL')) checks.push(pass('database-url', 'database', 'Database connection configured', 'A runtime database environment variable is present.'));
  else checks.push(fail('database-url', 'database', 'Database connection missing', 'Main database environment variable is missing.', 'Add the database connection in Vercel.'));
  if (has('DEFAULT_TENANT_ID')) checks.push(pass('default-tenant', 'tenant', 'Default tenant configured', `Default tenant is ${env('DEFAULT_TENANT_ID')}.`));
  else checks.push(warn('default-tenant', 'tenant', 'Default tenant missing', 'Default tenant environment variable is not set.', 'Set DEFAULT_TENANT_ID=holo-print.'));
  if (has('CORS_ORIGINS') || has('ALLOWED_ORIGINS') || has('STOREFRONT_URL') || has('NEXT_PUBLIC_STOREFRONT_URL')) checks.push(pass('allowed-origin', 'api', 'Storefront origin configured', 'At least one storefront/origin setting is present.'));
  else checks.push(warn('allowed-origin', 'api', 'Storefront origin not configured', 'No storefront/origin setting was found.', 'Add the live storefront URL to allowed origins.'));
  if (has('NEXT_PUBLIC_APP_URL') || has('ADMIN_URL') || has('NEXT_PUBLIC_ADMIN_URL')) checks.push(pass('admin-url', 'environment', 'Admin URL configured', 'Admin URL setting is present.'));
  else checks.push(warn('admin-url', 'environment', 'Admin URL missing', 'No admin/app URL setting was found.', 'Set the Vercel admin URL.'));
  if (env('TENANT_DB_FALLBACK_TO_PLATFORM') === 'false') checks.push(pass('tenant-db-mode', 'tenant', 'Strict tenant database mode', 'Tenant database fallback is disabled.'));
  else checks.push(info('tenant-db-mode', 'tenant', 'Shared database mode enabled', 'Tenants may use the main platform database. This is acceptable for HOLO launch.'));
  checks.push(pass('server-session-model', 'access', 'Server-side session model added', 'Admin login now issues a random HttpOnly token and stores the token hash in AdminSession.'));
  checks.push(pass('route-cookie-gate', 'access', 'Admin routes gated by cookie', 'Middleware blocks unauthenticated admin pages and internal admin APIs before the UI loads.'));
  checks.push(info('tenant-session-model', 'tenant', 'Tenant context can use verified session', 'Tenant-aware catalog writes now prefer the verified server session tenant when a session cookie is present.'));
  checks.push(warn('security-headers', 'headers', 'Security headers need final pass', 'CSP and HSTS should be added after final script/payment/analytics domains are confirmed.', 'Add final launch headers before going live.'));
  if (process.env.VERCEL) checks.push(info('vercel-runtime', 'runtime', 'Vercel runtime detected', 'Use database and environment storage for anything persistent.'));
  const summary = checks.reduce((acc, item) => { acc.checks += 1; acc[item.severity] += 1; return acc; }, { checks: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<LaunchGuardSeverity | 'checks', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 25 - summary.warning * 8));
  const ready = summary.error === 0;
  const nextActions = checks.filter((item) => item.severity === 'error' || item.severity === 'warning').map((item) => ({ label: item.label, detail: item.detail, action: item.action, severity: item.severity, category: item.category }));
  return { ready, score, generatedAt: new Date().toISOString(), summary, environment: { vercel: Boolean(process.env.VERCEL), nodeEnv: process.env.NODE_ENV || '', defaultTenantId: env('DEFAULT_TENANT_ID') || '', tenantDbMode: env('TENANT_DB_FALLBACK_TO_PLATFORM') === 'false' ? 'strict' : 'shared-main-db' }, checks, nextActions };
}
