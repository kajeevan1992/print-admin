import { ownerAuditSeed, type OwnerAuditRecord } from '@/data/owner-audit-log';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-audit-log';

export const ownerAuditLogService = createOwnerDbBackedService<OwnerAuditRecord>(STORAGE_KEY, ownerAuditSeed);
