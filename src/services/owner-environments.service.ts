import { ownerEnvironmentSeed, type OwnerEnvironmentRecord } from '@/data/owner-environments';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-environments';

export const ownerEnvironmentsService = createOwnerDbBackedService<OwnerEnvironmentRecord>(STORAGE_KEY, ownerEnvironmentSeed);
