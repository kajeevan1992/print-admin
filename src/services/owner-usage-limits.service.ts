import { ownerUsageLimitSeed, type OwnerUsageLimitRecord } from '@/data/owner-usage-limits';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-usage-limits';

export const ownerUsageLimitsService = createOwnerDbBackedService<OwnerUsageLimitRecord>(STORAGE_KEY, ownerUsageLimitSeed);
