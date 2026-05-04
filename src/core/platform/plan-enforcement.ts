import { prisma } from '@/lib/prisma';

type EnforcementResource = 'adminUsers' | 'storefronts' | 'products' | 'storageGb' | 'apiAccess' | 'supplierIntegrations';

type EnforcementResult = {
  ok: boolean;
  resource: EnforcementResource;
  tenantId: string;
  planName: string;
  used: number | boolean;
  limit: number | boolean;
  message: string;
  severity: 'ok' | 'warning' | 'blocked';
};

function boolFeature(enabled: boolean, tenantId: string, resource: EnforcementResource, planName: string, label: string): EnforcementResult {
  return {
    ok: enabled,
    resource,
    tenantId,
    planName,
    used: enabled,
    limit: enabled,
    severity: enabled ? 'ok' : 'blocked',
    message: enabled ? `${label} is enabled on ${planName}.` : `${label} is not included on ${planName}. Upgrade plan to continue.`,
  };
}

function limitCheck({ tenantId, planName, resource, used, limit, label }: { tenantId: string; planName: string; resource: EnforcementResource; used: number; limit: number; label: string }): EnforcementResult {
  const ok = used <= limit;
  const near = used >= Math.max(1, Math.floor(limit * 0.8));
  return {
    ok,
    resource,
    tenantId,
    planName,
    used,
    limit,
    severity: ok ? (near ? 'warning' : 'ok') : 'blocked',
    message: ok
      ? `${label}: ${used}/${limit} used on ${planName}.`
      : `${label} limit exceeded: ${used}/${limit} used on ${planName}. Upgrade plan or reduce usage.`,
  };
}

export async function checkTenantPlanLimits(tenantId: string): Promise<EnforcementResult[]> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found.');

  const plan = await (prisma as any).platformBillingPlan.findFirst({ where: { name: tenant.planName } });
  const [adminUsers, products, storefronts] = await Promise.all([
    prisma.user.count({ where: { tenantId, role: { in: ['TENANT_OWNER', 'TENANT_ADMIN', 'TENANT_STAFF'] as any } } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.domain.count({ where: { tenantId } }),
  ]);

  const planName = tenant.planName || plan?.name || 'Starter';
  const storefrontLimit = plan?.storefrontsLimit ?? tenant.storefrontsLimit ?? 1;
  const adminUsersLimit = plan?.adminUsersLimit ?? tenant.adminUsersLimit ?? 3;
  const storageLimitGb = plan?.storageLimitGb ?? tenant.storageLimitGb ?? 10;

  return [
    limitCheck({ tenantId, planName, resource: 'adminUsers', used: adminUsers, limit: adminUsersLimit, label: 'Admin users' }),
    limitCheck({ tenantId, planName, resource: 'storefronts', used: storefronts, limit: storefrontLimit, label: 'Storefronts/domains' }),
    limitCheck({ tenantId, planName, resource: 'products', used: products, limit: planName === 'Starter' ? 100 : planName === 'Growth' ? 1000 : 10000, label: 'Products' }),
    limitCheck({ tenantId, planName, resource: 'storageGb', used: 0, limit: storageLimitGb, label: 'Storage' }),
    boolFeature(Boolean(plan?.apiAccess), tenantId, 'apiAccess', planName, 'External API access'),
    boolFeature(Boolean(plan?.supplierIntegrations), tenantId, 'supplierIntegrations', planName, 'Supplier integrations'),
  ];
}

export async function assertTenantPlanAllows(tenantId: string, resource: EnforcementResource) {
  const checks = await checkTenantPlanLimits(tenantId);
  const check = checks.find((item) => item.resource === resource);
  if (!check) throw new Error(`Unknown plan resource: ${resource}`);
  if (!check.ok) {
    const error = new Error(check.message) as Error & { code?: string; details?: EnforcementResult };
    error.code = 'PLAN_LIMIT_BLOCKED';
    error.details = check;
    throw error;
  }
  return check;
}

export async function platformPlanSummary() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  const rows = [];
  for (const tenant of tenants) {
    const checks = await checkTenantPlanLimits(tenant.id);
    rows.push({ tenant, checks, blocked: checks.filter((item) => item.severity === 'blocked').length, warnings: checks.filter((item) => item.severity === 'warning').length });
  }
  return {
    tenants: rows,
    summary: {
      totalTenants: rows.length,
      tenantsBlocked: rows.filter((row) => row.blocked > 0).length,
      tenantsWarning: rows.filter((row) => row.warnings > 0).length,
    },
  };
}
