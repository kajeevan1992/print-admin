import { ownerBillingPlanSeed, type OwnerBillingPlanRecord } from '@/data/owner-billing-plans';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-billing-plans';

export const ownerBillingPlansService = createOwnerDbBackedService<OwnerBillingPlanRecord>(STORAGE_KEY, ownerBillingPlanSeed);
