import { ownerRevenueForecastSeed, type OwnerRevenueForecastRecord } from '@/data/owner-revenue-forecast';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-revenue-forecast';

export const ownerRevenueForecastService = createOwnerDbBackedService<OwnerRevenueForecastRecord>(STORAGE_KEY, ownerRevenueForecastSeed);
