import { ownerOnboardingSeed, type OwnerOnboardingRecord } from '@/data/owner-onboarding-pipeline';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-onboarding-pipeline';

export const ownerOnboardingPipelineService = createOwnerDbBackedService<OwnerOnboardingRecord>(STORAGE_KEY, ownerOnboardingSeed);
