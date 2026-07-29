import { headers } from 'next/headers';
import { platformPrisma } from '@/core/db/platform-prisma';
import { retryDatabaseConnection } from '@/core/db/database-errors';
import { queueInternalEmail } from '@/core/email/internal-email.service';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';

type Severity = 'info' | 'warning' | 'critical';
type EventInput = { action: string; actor?: string; tenantId?: string | null; severity?: Severity; metadata?: Record<string, unknown> };

function getHeader(name: string) { try { return headers().get(name) || ''; } catch { return ''; } }
function ip() { return getHeader('x-forwarded-for').split(',')[0]?.trim() || getHeader('x-real-ip') || ''; }
function ua() { return getHeader('user-agent') || ''; }
function mask(value: string) { if (!value.includes('@')) return value; const [name, domain] = value.split('@'); return `${name.slice(0, 2)}***@${domain}`; }

export async function recordSecurityEvent(input: EventInput) {
  const metadata = { severity: input.severity || 'info', ip: ip(), userAgent: ua(), ...(input.metadata || {}) };
  await retryDatabaseConnection(() => platformPrisma.$executeRawUnsafe(
    'INSERT INTO "AuditLog" (id,"tenantId",action,actor,metadata) VALUES ($1,$2,$3,$4,$5::jsonb)',
    `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input.tenantId || null,
    input.action,
    input.actor || '',
    JSON.stringify(metadata),
  ), 2);
  return { ok: true };
}

async function recentFailureCount(email: string, remoteIp: string) {
  return retryDatabaseConnection(async () => {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(`SELECT COUNT(*)::bigint AS count FROM "AuditLog" WHERE action='auth.admin.login_failed' AND "createdAt" > NOW() - INTERVAL '15 minutes' AND (lower(actor)=lower($1) OR metadata->>'ip'=$2)`, email, remoteIp);
    return Number(rows[0]?.count || 0);
  }, 2);
}

async function alertRecipients() {
  const configured = [process.env.SECURITY_ALERT_EMAIL, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.SMTP_FROM].filter(Boolean).map(String);
  if (configured.length) return [...new Set(configured)];
  const rows = await retryDatabaseConnection(() => platformPrisma.$queryRawUnsafe<Array<{ email: string }>>('SELECT email FROM "User" WHERE role::text=\'SUPERADMIN\' AND "isActive" IS TRUE LIMIT 3'), 2).catch(() => []);
  return rows.map((row) => row.email);
}

async function queueSuspiciousEmail(reason: string, email: string, count: number) {
  const recipients = await alertRecipients();
  for (const to of recipients) {
    await queueInternalEmail({
      type: 'security-alert',
      to,
      subject: 'Security alert: suspicious admin login activity',
      body: [
        'Security alert from Print Admin.',
        `Reason: ${reason}`,
        `Email: ${mask(email)}`,
        `Recent failures: ${count}`,
        `IP: ${ip() || 'unknown'}`,
        `User agent: ${ua() || 'unknown'}`,
        `Time: ${new Date().toISOString()}`,
      ].join('\n'),
    }).catch(() => undefined);
  }
}

export async function recordAdminLoginFailure(email: string, reason: string) {
  const remoteIp = ip();
  await recordSecurityEvent({ action: 'auth.admin.login_failed', actor: email, severity: 'warning', metadata: { reason } });
  const count = await recentFailureCount(email, remoteIp);
  if (count >= 5) {
    await recordSecurityEvent({ action: 'auth.admin.suspicious_login', actor: email, severity: 'critical', metadata: { reason: 'Five or more failures in 15 minutes', count } });
    await queueSuspiciousEmail('Five or more failed admin login attempts in 15 minutes', email, count);
    return { suspicious: true, count };
  }
  return { suspicious: false, count };
}

export async function recordAdminLoginSuccess(input: { email: string; tenantId?: string | null; role?: string }) {
  await recordSecurityEvent({ action: 'auth.admin.login_success', actor: input.email, tenantId: input.tenantId, severity: 'info', metadata: { role: input.role } });
}

export async function recordAdminLogout(input: { email?: string; tenantId?: string | null }) {
  await recordSecurityEvent({ action: 'auth.admin.logout', actor: input.email || '', tenantId: input.tenantId, severity: 'info' });
}

export async function listSecurityAuditEvents(options: { limit?: number; action?: string; search?: string } = {}) {
  await requireSuperAdmin();
  const limit = Math.max(1, Math.min(200, Number(options.limit || 100)));
  const rows = await retryDatabaseConnection(() => platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string | null; action: string; actor: string | null; metadata: unknown; createdAt: Date | string }>>(`SELECT id,"tenantId",action,actor,metadata,"createdAt" FROM "AuditLog" WHERE ($1='' OR action=$1) AND ($2='' OR lower(coalesce(actor,'') || ' ' || action || ' ' || coalesce(metadata::text,'')) LIKE lower($3)) ORDER BY "createdAt" DESC LIMIT ${limit}`, options.action || '', options.search || '', `%${options.search || ''}%`), 2);
  const items = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId || '',
    action: row.action,
    actor: row.actor || '',
    metadata: row.metadata || {},
    severity: (row.metadata as any)?.severity || 'info',
    ip: (row.metadata as any)?.ip || '',
    userAgent: (row.metadata as any)?.userAgent || '',
    createdAt: row.createdAt,
  }));
  return {
    items,
    summary: {
      total: items.length,
      critical: items.filter((item) => item.severity === 'critical').length,
      warning: items.filter((item) => item.severity === 'warning').length,
      loginFailures: items.filter((item) => item.action === 'auth.admin.login_failed').length,
    },
  };
}
