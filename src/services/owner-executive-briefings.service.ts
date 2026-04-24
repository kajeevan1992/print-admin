import { ownerExecutiveBriefingSeed, type OwnerExecutiveBriefingRecord } from '@/data/owner-executive-briefings';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-executive-briefings';

export const ownerExecutiveBriefingsService = createOwnerDbBackedService<OwnerExecutiveBriefingRecord>(STORAGE_KEY, ownerExecutiveBriefingSeed);
