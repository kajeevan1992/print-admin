import { ownerRunbookSeed, type OwnerRunbookRecord } from '@/data/owner-runbooks';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-runbooks';

export const ownerRunbooksService = createOwnerDbBackedService<OwnerRunbookRecord>(STORAGE_KEY, ownerRunbookSeed);
