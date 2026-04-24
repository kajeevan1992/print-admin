import { ownerReleaseApprovalSeed, type OwnerReleaseApprovalRecord } from '@/data/owner-release-approvals';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-release-approvals';

export const ownerReleaseApprovalsService = createOwnerDbBackedService<OwnerReleaseApprovalRecord>(STORAGE_KEY, ownerReleaseApprovalSeed);
