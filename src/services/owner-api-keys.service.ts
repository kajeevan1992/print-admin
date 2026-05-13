import type { OwnerApiKeyRecord } from '@/data/owner-api-keys';
import { createOwnerControlRecordsService } from '@/services/owner-control-records.service';

export const ownerApiKeysService = createOwnerControlRecordsService<OwnerApiKeyRecord>('owner-api-keys');