import type { TenantContext } from './types';

export function tenantContextFromRequest(request: Request): TenantContext {
  const url = new URL(request.url);
  const headers = request.headers;

  return {
    tenantId:
      url.searchParams.get('tenantId') ||
      headers.get('x-tenant-id') ||
      process.env.DEFAULT_TENANT_ID ||
      'platform-demo',
    siteId: url.searchParams.get('siteId') || headers.get('x-site-id') || undefined,
    databaseConnectionId:
      url.searchParams.get('databaseConnectionId') ||
      headers.get('x-database-connection-id') ||
      undefined,
  };
}
