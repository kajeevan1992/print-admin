import { ownerFeatureFlagSeed, type OwnerFeatureFlagRecord } from '@/data/owner-feature-flags';
import { createInternalConfigRecordsService } from '@/services/internal-config-records.service';

export const ownerFeatureFlagsService = createInternalConfigRecordsService<OwnerFeatureFlagRecord>({
  configKey: 'owner-feature-flags',
  storageKey: 'print-admin.owner-feature-flags',
  seed: ownerFeatureFlagSeed,
});
