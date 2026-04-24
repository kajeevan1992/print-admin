import { ownerWebhookSeed, type OwnerWebhookRecord } from '@/data/owner-webhooks';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-webhooks';

export const ownerWebhooksService = createOwnerDbBackedService<OwnerWebhookRecord>(STORAGE_KEY, ownerWebhookSeed);
