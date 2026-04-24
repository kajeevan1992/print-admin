import { ownerOnboardingSeed, type OwnerOnboardingRecord } from '@/data/owner-onboarding';

const KEY = 'print-admin.owner-onboarding.records';

function read(): OwnerOnboardingRecord[] {
  if (typeof window === 'undefined') return ownerOnboardingSeed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return ownerOnboardingSeed;
    const parsed = JSON.parse(raw) as OwnerOnboardingRecord[];
    return Array.isArray(parsed) ? parsed : ownerOnboardingSeed;
  } catch {
    return ownerOnboardingSeed;
  }
}

function write(records: OwnerOnboardingRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

export const ownerOnboardingService = {
  async list() { return read(); },
  async save(record: OwnerOnboardingRecord) {
    const rows = read();
    const next = rows.some((item) => item.id === record.id)
      ? rows.map((item) => item.id === record.id ? record : item)
      : [record, ...rows];
    write(next);
    return record;
  },
  async remove(id: string) {
    write(read().filter((item) => item.id !== id));
  },
  async reset() {
    write(ownerOnboardingSeed);
  }
};
