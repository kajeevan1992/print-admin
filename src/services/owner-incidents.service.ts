import { ownerIncidentSeed, type OwnerIncidentRecord } from '@/data/owner-incidents';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-incidents';

export const ownerIncidentsService = createOwnerDbBackedService<OwnerIncidentRecord>(STORAGE_KEY, ownerIncidentSeed);
