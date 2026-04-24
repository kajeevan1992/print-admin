import { ownerComplianceSeed, type OwnerComplianceRecord } from '@/data/owner-compliance-center';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-compliance-center';

export const ownerComplianceCenterService = createOwnerDbBackedService<OwnerComplianceRecord>(STORAGE_KEY, ownerComplianceSeed);
