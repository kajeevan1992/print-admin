import { tenantControlSeed, type TenantControlRecord } from '@/data/tenant-control';
import { createInternalConfigRecordsService } from '@/services/internal-config-records.service';

const tenantControlRecords = createInternalConfigRecordsService<TenantControlRecord>({
  configKey: 'owner-tenant-control',
  storageKey: 'print-admin.tenant-control.records',
  seed: tenantControlSeed,
});

export const tenantControlService = {
  async list() { return tenantControlRecords.list(); },
  async save(record: TenantControlRecord) { return tenantControlRecords.save(record); },
  async remove(id: string) { return tenantControlRecords.delete(id); },
  async reset() { return tenantControlRecords.reset(); }
};
