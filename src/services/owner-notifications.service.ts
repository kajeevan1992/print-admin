
import { ownerNotificationSeed, type OwnerNotificationRecord } from '@/data/owner-notifications';

const STORAGE_KEY = 'print-admin.owner-notifications';

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

export const ownerNotificationsService = {
  async list() {
    await wait();
    return readStore<OwnerNotificationRecord>(STORAGE_KEY, ownerNotificationSeed);
  },
  async save(record: OwnerNotificationRecord) {
    await wait();
    const items = readStore<OwnerNotificationRecord>(STORAGE_KEY, ownerNotificationSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEY, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async delete(id: string) {
    await wait();
    writeStore(STORAGE_KEY, readStore<OwnerNotificationRecord>(STORAGE_KEY, ownerNotificationSeed).filter((item) => item.id !== id));
  },
  async reset() {
    await wait();
    writeStore(STORAGE_KEY, ownerNotificationSeed);
    return ownerNotificationSeed;
  }
};
