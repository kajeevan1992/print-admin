import { licensingSeed, type LicenseRecord } from '@/data/licensing-center';

const KEY = 'print-admin.licensing-center.records';

function read(): LicenseRecord[] {
  if (typeof window === 'undefined') return licensingSeed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return licensingSeed;
    const parsed = JSON.parse(raw) as LicenseRecord[];
    return Array.isArray(parsed) ? parsed : licensingSeed;
  } catch {
    return licensingSeed;
  }
}

function write(records: LicenseRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

export const licensingCenterService = {
  async list() { return read(); },
  async save(record: LicenseRecord) {
    const rows = read();
    const next = rows.some((item) => item.id === record.id) ? rows.map((item) => item.id === record.id ? record : item) : [record, ...rows];
    write(next);
    return record;
  },
  async remove(id: string) { write(read().filter((item) => item.id !== id)); },
  async reset() { write(licensingSeed); }
};
