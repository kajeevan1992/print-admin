import { ownerRenewalSeed, type OwnerRenewalRecord } from '@/data/owner-renewals';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-renewals';

export const ownerRenewalsService = createOwnerDbBackedService<OwnerRenewalRecord>(STORAGE_KEY, ownerRenewalSeed);
