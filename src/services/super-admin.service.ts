import { demoUploadSeed, deploymentSeed, tenantAccountsSeed, type DemoUploadRecord, type DeploymentRecord, type TenantAccount } from '@/data/super-admin';

const STORAGE_KEYS = {
  tenants: 'print-admin.super-admin.tenants',
  deployments: 'print-admin.super-admin.deployments',
  demos: 'print-admin.super-admin.demos'
} as const;

const wait = async () => new Promise((resolve) => setTimeout(resolve, 70));

function readStore<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, next: T[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(next));
}

export const superAdminService = {
  async listTenants() {
    await wait();
    return readStore<TenantAccount>(STORAGE_KEYS.tenants, tenantAccountsSeed);
  },
  async saveTenant(record: TenantAccount) {
    await wait();
    const items = readStore<TenantAccount>(STORAGE_KEYS.tenants, tenantAccountsSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEYS.tenants, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async deleteTenant(id: string) {
    await wait();
    writeStore(STORAGE_KEYS.tenants, readStore<TenantAccount>(STORAGE_KEYS.tenants, tenantAccountsSeed).filter((item) => item.id !== id));
  },
  async resetTenants() {
    await wait();
    writeStore(STORAGE_KEYS.tenants, tenantAccountsSeed);
    return tenantAccountsSeed;
  },

  async listDeployments() {
    await wait();
    return readStore<DeploymentRecord>(STORAGE_KEYS.deployments, deploymentSeed);
  },
  async saveDeployment(record: DeploymentRecord) {
    await wait();
    const items = readStore<DeploymentRecord>(STORAGE_KEYS.deployments, deploymentSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEYS.deployments, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async deleteDeployment(id: string) {
    await wait();
    writeStore(STORAGE_KEYS.deployments, readStore<DeploymentRecord>(STORAGE_KEYS.deployments, deploymentSeed).filter((item) => item.id !== id));
  },
  async resetDeployments() {
    await wait();
    writeStore(STORAGE_KEYS.deployments, deploymentSeed);
    return deploymentSeed;
  },

  async listDemoUploads() {
    await wait();
    return readStore<DemoUploadRecord>(STORAGE_KEYS.demos, demoUploadSeed);
  },
  async saveDemoUpload(record: DemoUploadRecord) {
    await wait();
    const items = readStore<DemoUploadRecord>(STORAGE_KEYS.demos, demoUploadSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEYS.demos, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async deleteDemoUpload(id: string) {
    await wait();
    writeStore(STORAGE_KEYS.demos, readStore<DemoUploadRecord>(STORAGE_KEYS.demos, demoUploadSeed).filter((item) => item.id !== id));
  },
  async resetDemoUploads() {
    await wait();
    writeStore(STORAGE_KEYS.demos, demoUploadSeed);
    return demoUploadSeed;
  }
};
