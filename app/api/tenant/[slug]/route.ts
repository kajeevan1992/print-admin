import { fail, ok } from '@/lib/api/responses';
import { hasDatabaseUrl } from '@/lib/api/db-env';
import { getTenantBySlug } from '@/lib/services/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: { slug: string } }
) {
  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const tenant = await getTenantBySlug(context.params.slug);

  if (!tenant) {
    return fail('TENANT_NOT_FOUND', 'No tenant matched the requested slug.', 404);
  }

  return ok({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    defaultSubdomain: tenant.defaultSubdomain,
    primaryDomain: tenant.primaryDomain,
    themeKey: tenant.themeKey,
    supportEmail: tenant.supportEmail,
    domains: tenant.domains.map((domain) => ({
      hostname: domain.hostname,
      type: domain.type,
      isPrimary: domain.isPrimary,
      verificationStatus: domain.verificationStatus,
      sslStatus: domain.sslStatus,
    })),
  });
}
