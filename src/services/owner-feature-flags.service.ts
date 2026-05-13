import type { OwnerFeatureFlagRecord } from '@/data/owner-feature-flags';
import { createOwnerControlRecordsService } from '@/services/owner-control-records.service';

export const ownerFeatureFlagsService = createOwnerControlRecordsService<OwnerFeatureFlagRecord>('owner-feature-flags');