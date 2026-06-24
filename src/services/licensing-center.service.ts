import type { LicenseRecord } from '@/data/licensing-center';
import { createInternalConfigRecordsService } from '@/services/internal-config-records.service';

const licensingRecords = createInternalConfigRecordsService<LicenseRecord>({
  configKey: 'owner-licensing-center',
  storageKey: 'print-admin.licensing-center.records',
  seed: [],
});

export const licensingCenterService = {
  async list() { return licensingRecords.list(); },
  async save(record: LicenseRecord) { return licensingRecords.save(record); },
  async remove(id: string) { return licensingRecords.delete(id); },
  async reset() { return []; }
};
