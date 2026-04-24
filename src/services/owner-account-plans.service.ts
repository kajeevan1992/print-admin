import { ownerAccountPlanSeed, type OwnerAccountPlanRecord } from '@/data/owner-account-plans';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-account-plans';

export const ownerAccountPlansService = createOwnerDbBackedService<OwnerAccountPlanRecord>(STORAGE_KEY, ownerAccountPlanSeed);
