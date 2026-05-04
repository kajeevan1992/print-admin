import { demoUploadSeed, deploymentSeed, tenantAccountsSeed, type DemoUploadRecord, type DeploymentRecord, type TenantAccount } from '@/data/super-admin';

type StoreShape = {
  tenants: TenantAccount[];
  deployments: DeploymentRecord[];
  demos: DemoUploadRecord[];
};

const globalKey = '__print_admin_super_admin_store__';

function getStore(): StoreShape {
  const g = globalThis as unknown as Record<string, StoreShape>;
  if (!g[globalKey]) {
    g[globalKey] = {
      tenants: [...tenantAccountsSeed],
      deployments: [...deploymentSeed],
      demos: [...demoUploadSeed],
    };
  }
  return g[globalKey];
}

function upsert<T extends { id: string }>(items: T[], record: T) {
  const exists = items.some((item) => item.id === record.id);
  return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
}

export const superAdminStore = {
  listTenants() {
    return getStore().tenants;
  },
  saveTenant(record: TenantAccount) {
    const store = getStore();
    store.tenants = upsert(store.tenants, record);
    return record;
  },
  deleteTenant(id: string) {
    const store = getStore();
    store.tenants = store.tenants.filter((item) => item.id !== id);
    return { deletedId: id };
  },
  resetTenants() {
    const store = getStore();
    store.tenants = [...tenantAccountsSeed];
    return store.tenants;
  },

  listDeployments() {
    return getStore().deployments;
  },
  saveDeployment(record: DeploymentRecord) {
    const store = getStore();
    store.deployments = upsert(store.deployments, record);
    return record;
  },
  deleteDeployment(id: string) {
    const store = getStore();
    store.deployments = store.deployments.filter((item) => item.id !== id);
    return { deletedId: id };
  },
  resetDeployments() {
    const store = getStore();
    store.deployments = [...deploymentSeed];
    return store.deployments;
  },

  listDemoUploads() {
    return getStore().demos;
  },
  saveDemoUpload(record: DemoUploadRecord) {
    const store = getStore();
    store.demos = upsert(store.demos, record);
    return record;
  },
  deleteDemoUpload(id: string) {
    const store = getStore();
    store.demos = store.demos.filter((item) => item.id !== id);
    return { deletedId: id };
  },
  resetDemoUploads() {
    const store = getStore();
    store.demos = [...demoUploadSeed];
    return store.demos;
  },

  summary() {
    const store = getStore();
    return {
      tenants: store.tenants.length,
      activeTenants: store.tenants.filter((item) => item.status === 'active').length,
      atRisk: store.tenants.filter((item) => item.health !== 'healthy' || item.status === 'past_due').length,
      deployments: store.deployments.length,
      queuedDeployments: store.deployments.filter((item) => item.status !== 'ready').length,
      demos: store.demos.length,
      mrr: store.tenants.reduce((sum, item) => sum + item.monthlyRecurringRevenue, 0),
    };
  },
};
