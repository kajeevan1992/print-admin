import { fail, ok } from '@/lib/api/responses';
import { resolveTenantByHostname } from '@/lib/tenant/resolve-hostname';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostname = searchParams.get('hostname');

  if (!hostname) {
    return fail('HOSTNAME_REQUIRED', 'hostname query parameter is required.', 400);
  }

  const tenant = await resolveTenantByHostname(hostname);

  if (!tenant) {
    return fail('TENANT_NOT_FOUND', 'No tenant matched the provided hostname.', 404);
  }

  return ok(tenant);
}
