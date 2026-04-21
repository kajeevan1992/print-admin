import { fail, ok } from '@/lib/api/responses';
import { resolveTenantByHostname } from '@/lib/tenant/resolve-hostname';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostname = searchParams.get('hostname');

  if (!hostname) {
    return fail('HOSTNAME_REQUIRED', 'hostname query parameter is required.', 400);
  }

  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const tenant = await resolveTenantByHostname(hostname);

  if (!tenant) {
    return fail('TENANT_NOT_FOUND', 'No tenant matched the provided hostname.', 404);
  }

  return ok(tenant);
}
