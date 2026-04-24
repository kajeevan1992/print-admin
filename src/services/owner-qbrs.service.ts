import { ownerQbrSeed, type OwnerQbrRecord } from '@/data/owner-qbrs';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-qbrs';

export const ownerQbrsService = createOwnerDbBackedService<OwnerQbrRecord>(STORAGE_KEY, ownerQbrSeed);
