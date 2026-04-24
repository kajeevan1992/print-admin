import { ownerStakeholderSeed, type OwnerStakeholderRecord } from '@/data/owner-stakeholder-map';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-stakeholder-map';

export const ownerStakeholderMapService = createOwnerDbBackedService<OwnerStakeholderRecord>(STORAGE_KEY, ownerStakeholderSeed);
