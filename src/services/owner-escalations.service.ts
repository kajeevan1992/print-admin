import { ownerEscalationSeed, type OwnerEscalationRecord } from '@/data/owner-escalations';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-escalations';

export const ownerEscalationsService = createOwnerDbBackedService<OwnerEscalationRecord>(STORAGE_KEY, ownerEscalationSeed);
