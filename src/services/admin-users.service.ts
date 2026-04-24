import { adminUsersSeed, type AdminUserRecord } from '@/data/admin-users';

const KEY = 'print-admin.admin-users.records';

function read(): AdminUserRecord[] {
  if (typeof window === 'undefined') return adminUsersSeed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return adminUsersSeed;
    const parsed = JSON.parse(raw) as AdminUserRecord[];
    return Array.isArray(parsed) ? parsed : adminUsersSeed;
  } catch {
    return adminUsersSeed;
  }
}

function write(records: AdminUserRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

export const adminUsersService = {
  async list() { return read(); },
  async save(record: AdminUserRecord) {
    const rows = read();
    const next = rows.some((item) => item.id === record.id)
      ? rows.map((item) => (item.id === record.id ? record : item))
      : [record, ...rows];
    write(next);
    return record;
  },
  async remove(id: string) { write(read().filter((item) => item.id !== id)); },
  async reset() { write(adminUsersSeed); }
};
