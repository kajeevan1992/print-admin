import { ownerMaintenanceSeed, type OwnerMaintenanceRecord } from '@/data/owner-maintenance-windows';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-maintenance-windows';

export const ownerMaintenanceWindowsService = createOwnerDbBackedService<OwnerMaintenanceRecord>(STORAGE_KEY, ownerMaintenanceSeed);
