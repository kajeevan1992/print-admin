import { ownerCustomerJourneySeed, type OwnerCustomerJourneyRecord } from '@/data/owner-customer-journeys';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-customer-journeys';

export const ownerCustomerJourneysService = createOwnerDbBackedService<OwnerCustomerJourneyRecord>(STORAGE_KEY, ownerCustomerJourneySeed);
