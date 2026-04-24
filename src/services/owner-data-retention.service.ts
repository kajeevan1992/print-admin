import { ownerRetentionSeed, type OwnerRetentionRecord } from '@/data/owner-data-retention';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-data-retention';

export const ownerDataRetentionService = createOwnerDbBackedService<OwnerRetentionRecord>(STORAGE_KEY, ownerRetentionSeed);
