import { ownerSuccessPlanSeed, type OwnerSuccessPlanRecord } from '@/data/owner-success-plans';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-success-plans';

export const ownerSuccessPlansService = createOwnerDbBackedService<OwnerSuccessPlanRecord>(STORAGE_KEY, ownerSuccessPlanSeed);
