import { ownerOnboardingSeed, type OwnerOnboardingRecord } from '@/data/owner-onboarding';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-onboarding.records';

export const ownerOnboardingService = createOwnerDbBackedService<OwnerOnboardingRecord>(STORAGE_KEY, ownerOnboardingSeed);
