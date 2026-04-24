import { ownerSsoConfigSeed, type OwnerSsoConfigRecord } from '@/data/owner-sso-config';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-sso-config';

export const ownerSsoConfigService = createOwnerDbBackedService<OwnerSsoConfigRecord>(STORAGE_KEY, ownerSsoConfigSeed);
