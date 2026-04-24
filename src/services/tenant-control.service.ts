import { tenantControlSeed, type TenantControlRecord } from '@/data/tenant-control';

const KEY = 'print-admin.tenant-control.records';

function read(): TenantControlRecord[] {
  if (typeof window === 'undefined') return tenantControlSeed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return tenantControlSeed;
    const parsed = JSON.parse(raw) as TenantControlRecord[];
    return Array.isArray(parsed) ? parsed : tenantControlSeed;
  } catch {
    return tenantControlSeed;
  }
}

function write(records: TenantControlRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

export const tenantControlService = {
  async list() { return read(); },
  async save(record: TenantControlRecord) {
    const rows = read();
    const next = rows.some((item) => item.id === record.id) ? rows.map((item) => item.id === record.id ? record : item) : [record, ...rows];
    write(next);
    return record;
  },
  async remove(id: string) { write(read().filter((item) => item.id !== id)); },
  async reset() { write(tenantControlSeed); }
};
