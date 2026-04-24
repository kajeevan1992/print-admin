import { ownerCommercialApprovalSeed, type OwnerCommercialApprovalRecord } from '@/data/owner-commercial-approvals';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-commercial-approvals';

export const ownerCommercialApprovalsService = createOwnerDbBackedService<OwnerCommercialApprovalRecord>(STORAGE_KEY, ownerCommercialApprovalSeed);
