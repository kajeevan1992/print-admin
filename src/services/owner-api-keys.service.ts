import { ownerApiKeySeed, type OwnerApiKeyRecord } from '@/data/owner-api-keys';
import { createInternalConfigRecordsService } from '@/services/internal-config-records.service';

export const ownerApiKeysService = createInternalConfigRecordsService<OwnerApiKeyRecord>({
  configKey: 'owner-api-keys',
  storageKey: 'print-admin.owner-api-keys',
  seed: ownerApiKeySeed,
});
