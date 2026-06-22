import { readAdminSessionFromToken, ADMIN_SESSION_COOKIE } from '@/core/auth/session-guard.service';
import type { TenantContext } from './types';

function cookieValue(header: string | null, name: string) {
  if (!header) return '';
  const match = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

export function tenantContextFromRequest(request: Request): TenantContext {
  const url = new URL(request.url);
  const headers = request.headers;
  return {
    tenantId: url.searchParams.get('tenantId') || headers.get('x-tenant-id') || process.env.DEFAULT_TENANT_ID || 'platform-demo',
    siteId: url.searchParams.get('siteId') || headers.get('x-site-id') || undefined,
    databaseConnectionId: url.searchParams.get('databaseConnectionId') || headers.get('x-database-connection-id') || undefined,
  };
}

export async function verifiedTenantContextFromRequest(request: Request): Promise<TenantContext> {
  const fallback = tenantContextFromRequest(request);
  const token = cookieValue(request.headers.get('cookie'), ADMIN_SESSION_COOKIE);
  const session = await readAdminSessionFromToken(token);
  if (!session) return fallback;
  return { ...fallback, tenantId: session.tenantId || fallback.tenantId };
}
