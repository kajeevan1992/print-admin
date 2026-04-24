import { ownerExpansionPipelineSeed, type OwnerExpansionPipelineRecord } from '@/data/owner-expansion-pipeline';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-expansion-pipeline';

export const ownerExpansionPipelineService = createOwnerDbBackedService<OwnerExpansionPipelineRecord>(STORAGE_KEY, ownerExpansionPipelineSeed);
