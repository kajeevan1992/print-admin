import { ownerRevenueForecastSeed, type OwnerRevenueForecastRecord } from '@/data/owner-revenue-forecast';

const STORAGE_KEY = 'print-admin.owner-revenue-forecast';

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

export const ownerRevenueForecastService = {
  async list() {
    await wait();
    return readStore<OwnerRevenueForecastRecord>(STORAGE_KEY, ownerRevenueForecastSeed);
  },
  async save(record: OwnerRevenueForecastRecord) {
    await wait();
    const items = readStore<OwnerRevenueForecastRecord>(STORAGE_KEY, ownerRevenueForecastSeed);
    const exists = items.some((item) => item.id === record.id);
    writeStore(STORAGE_KEY, exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items]);
    return record;
  },
  async delete(id: string) {
    await wait();
    writeStore(STORAGE_KEY, readStore<OwnerRevenueForecastRecord>(STORAGE_KEY, ownerRevenueForecastSeed).filter((item) => item.id !== id));
  },
  async reset() {
    await wait();
    writeStore(STORAGE_KEY, ownerRevenueForecastSeed);
    return ownerRevenueForecastSeed;
  }
};
