import { ownerNotificationSeed, type OwnerNotificationRecord } from '@/data/owner-notifications';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-notifications';

export const ownerNotificationsService = createOwnerDbBackedService<OwnerNotificationRecord>(STORAGE_KEY, ownerNotificationSeed);
