import { ownerCustomerHealthSeed, type OwnerCustomerHealthRecord } from '@/data/owner-customer-health';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-customer-health';

export const ownerCustomerHealthService = createOwnerDbBackedService<OwnerCustomerHealthRecord>(STORAGE_KEY, ownerCustomerHealthSeed);
