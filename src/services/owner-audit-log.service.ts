
import { ownerAuditSeed, type OwnerAuditRecord } from '@/data/owner-audit-log';

const STORAGE_KEY = 'print-admin.owner-audit-log';

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

export const ownerAuditLogService = {
  async list() {
    await wait();
    return readStore<OwnerAuditRecord>(STORAGE_KEY, ownerAuditSeed);
  },
  async reset() {
    await wait();
    writeStore(STORAGE_KEY, ownerAuditSeed);
    return ownerAuditSeed;
  }
};
