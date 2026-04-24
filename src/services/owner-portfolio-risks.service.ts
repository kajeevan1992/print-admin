import { ownerPortfolioRiskSeed, type OwnerPortfolioRiskRecord } from '@/data/owner-portfolio-risks';
import { createOwnerDbBackedService } from '@/services/owner-records-db.service';

const STORAGE_KEY = 'print-admin.owner-portfolio-risks';

export const ownerPortfolioRisksService = createOwnerDbBackedService<OwnerPortfolioRiskRecord>(STORAGE_KEY, ownerPortfolioRiskSeed);
