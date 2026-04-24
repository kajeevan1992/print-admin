import { prisma } from '@/lib/prisma';

export function normalizeHostname(input?: string | null) {
  return (input ?? '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
}

export async function resolveTenantByHostname(hostname?: string | null) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;

  const domain = await prisma.domain.findUnique({
    where: { hostname: normalized },
    include: { tenant: true },
  });

  if (!domain?.tenant) return null;

  return {
    tenantId: domain.tenant.id,
    tenantSlug: domain.tenant.slug,
    tenantName: domain.tenant.name,
    hostname: normalized,
    primaryDomain: domain.tenant.primaryDomain,
    themeKey: domain.tenant.themeKey,
    supportEmail: domain.tenant.supportEmail,
  };
}
