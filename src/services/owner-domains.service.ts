import { ownerDomainSeed, type OwnerDomainRecord } from '@/data/owner-domains';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-domains';

export const ownerDomainsService = createOwnerDbBackedService<OwnerDomainRecord>(STORAGE_KEY, ownerDomainSeed);
