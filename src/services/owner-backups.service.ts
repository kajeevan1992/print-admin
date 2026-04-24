import { ownerBackupSeed, type OwnerBackupRecord } from '@/data/owner-backups';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-backups';

export const ownerBackupsService = createOwnerDbBackedService<OwnerBackupRecord>(STORAGE_KEY, ownerBackupSeed);
