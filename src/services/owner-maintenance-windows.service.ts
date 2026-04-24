
import { ownerMaintenanceSeed, type OwnerMaintenanceRecord } from '@/data/owner-maintenance-windows';

const STORAGE_KEY = 'print-admin.owner-maintenance-windows';

const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

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

export const ownerMaintenanceWindowsService = {
  async list() {
    await wait();
    return readStore<OwnerMaintenanceRecord>(STORAGE_KEY, ownerMaintenanceSeed);
  },
  async save(record: OwnerMaintenanceRecord) {
    await wait();
    const items = readStore<OwnerMaintenanceRecord>(STORAGE_KEY, ownerMaintenanceSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEY, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async delete(id: string) {
    await wait();
    writeStore(STORAGE_KEY, readStore<OwnerMaintenanceRecord>(STORAGE_KEY, ownerMaintenanceSeed).filter((item) => item.id !== id));
  },
  async reset() {
    await wait();
    writeStore(STORAGE_KEY, ownerMaintenanceSeed);
    return ownerMaintenanceSeed;
  }
};
