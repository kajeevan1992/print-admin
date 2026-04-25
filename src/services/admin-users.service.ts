import { adminUsersSeed, type AdminUserRecord } from '@/data/admin-users';
import { createInternalConfigRecordsService } from '@/services/internal-config-records.service';

const adminUsersRecords = createInternalConfigRecordsService<AdminUserRecord>({
  configKey: 'super-admin-users',
  storageKey: 'print-admin.admin-users.records',
  seed: adminUsersSeed,
});

export const adminUsersService = {
  async list() { return adminUsersRecords.list(); },
  async save(record: AdminUserRecord) { return adminUsersRecords.save(record); },
  async remove(id: string) { return adminUsersRecords.delete(id); },
  async reset() { return adminUsersRecords.reset(); }
};
