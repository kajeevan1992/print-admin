import { platformPrisma } from '@/core/db/platform-prisma';
import {
  createStore,
  findStore,
  publishStore,
  type StorefrontStoreRecord,
} from '@/core/api/storefront-v1.service';
import type { TenantContext } from '@/core/tenant/types';

const TARGET = {
  tenantSlug: 'holo-print-sidcup',
  storeId: 'default-store',
  storeSlug: 'default-store',
  storeName: 'HOLO Print',
  liveTheme: 'base-atlantis',
} as const;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type HoloStorefrontRepairStatus = {
  target: typeof TARGET;
  tenant: TenantRow | null;
  store: StorefrontStoreRecord | null;
  storefrontUrl: string;
  canRepair: boolean;
  reason: string;
};

export type HoloStorefrontRepairResult = HoloStorefrontRepairStatus & {
  changed: boolean;
  action: 'created-and-published' | 'published-existing' | 'already-ready';
};

async function resolveTargetTenant() {
  const rows = await platformPrisma.$queryRawUnsafe<TenantRow[]>(
    `SELECT id,slug,name,status
     FROM "Tenant"
     WHERE id=$1 OR slug=$1
     ORDER BY CASE WHEN slug=$1 THEN 0 ELSE 1 END
     LIMIT 2`,
    TARGET.tenantSlug,
  ).catch(() => []);

  if (rows.length > 1 && rows[0]?.id !== rows[1]?.id) {
    throw new Error('Multiple HOLO tenant records matched the canonical identifier. Repair refused to avoid writing to the wrong tenant.');
  }

  return rows[0] || null;
}

function contextFor(tenant: TenantRow): TenantContext {
  return { tenantId: tenant.id, siteId: TARGET.storeId };
}

function storefrontUrl(tenant: TenantRow | null) {
  return `/native-stores/${tenant?.slug || TARGET.tenantSlug}/${TARGET.storeSlug}`;
}

export async function getHoloStorefrontRepairStatus(): Promise<HoloStorefrontRepairStatus> {
  const tenant = await resolveTargetTenant();
  if (!tenant) {
    return {
      target: TARGET,
      tenant: null,
      store: null,
      storefrontUrl: storefrontUrl(null),
      canRepair: false,
      reason: `Tenant ${TARGET.tenantSlug} was not found. No tenant was created or changed.`,
    };
  }

  const store = await findStore(contextFor(tenant), TARGET.storeId);
  if (store) {
    return {
      target: TARGET,
      tenant,
      store,
      storefrontUrl: storefrontUrl(tenant),
      canRepair: store.status !== 'published',
      reason: store.status === 'published'
        ? 'The HOLO default storefront already exists and is published.'
        : 'The HOLO default storefront exists but is not published.',
    };
  }

  return {
    target: TARGET,
    tenant,
    store: null,
    storefrontUrl: storefrontUrl(tenant),
    canRepair: true,
    reason: 'The canonical HOLO tenant exists, but its default storefront record is missing.',
  };
}

export async function repairHoloDefaultStore(request: Request): Promise<HoloStorefrontRepairResult> {
  const tenant = await resolveTargetTenant();
  if (!tenant) {
    throw new Error(`Tenant ${TARGET.tenantSlug} was not found. Repair refused; no tenant was created.`);
  }

  const ctx = contextFor(tenant);
  const existing = await findStore(ctx, TARGET.storeId);

  if (existing?.status === 'published') {
    return {
      target: TARGET,
      tenant,
      store: existing,
      storefrontUrl: storefrontUrl(tenant),
      canRepair: false,
      reason: 'The HOLO default storefront already exists and is published.',
      changed: false,
      action: 'already-ready',
    };
  }

  if (existing) {
    const published = await publishStore(ctx, existing.storeId);
    return {
      target: TARGET,
      tenant,
      store: published,
      storefrontUrl: storefrontUrl(tenant),
      canRepair: false,
      reason: 'The existing HOLO default storefront was published without changing its theme or content.',
      changed: true,
      action: 'published-existing',
    };
  }

  const created = await createStore(ctx, {
    id: TARGET.storeId,
    storeId: TARGET.storeId,
    slug: TARGET.storeSlug,
    name: TARGET.storeName,
    theme: TARGET.liveTheme,
    selectedTheme: TARGET.liveTheme,
    previewUrl: storefrontUrl(tenant),
    branding: {
      brandName: TARGET.storeName,
      primaryColor: '#18A7D0',
      tagline: 'Design, Print, Sign & Web',
    },
    content: {},
    navigation: [],
  }, request);

  const published = await publishStore(ctx, created.storeId);
  return {
    target: TARGET,
    tenant,
    store: published,
    storefrontUrl: storefrontUrl(tenant),
    canRepair: false,
    reason: 'The missing HOLO default storefront was created and published with Atlantis as its live theme.',
    changed: true,
    action: 'created-and-published',
  };
}
