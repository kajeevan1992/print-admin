import { createOwnerControlRecordsService, listOwnerControlRecordGroup, type OwnerControlResource } from './owner-control-records.service';

type OwnerRecord = { id: string; [key: string]: any };

export const ownerBillingPlans = createOwnerControlRecordsService<OwnerRecord>('owner-billing-plans');
export const ownerComplianceControls = createOwnerControlRecordsService<OwnerRecord>('owner-compliance-controls');
export const ownerUsageLimits = createOwnerControlRecordsService<OwnerRecord>('owner-usage-limits');
export const ownerBackups = createOwnerControlRecordsService<OwnerRecord>('owner-backups');
export const ownerSsoConfigs = createOwnerControlRecordsService<OwnerRecord>('owner-sso-configs');
export const ownerDomains = createOwnerControlRecordsService<OwnerRecord>('owner-domains');
export const ownerIncidents = createOwnerControlRecordsService<OwnerRecord>('owner-incidents');
export const ownerMaintenanceWindows = createOwnerControlRecordsService<OwnerRecord>('owner-maintenance-windows');

export const SUPER_ADMIN_BATCH_2_RESOURCES: OwnerControlResource[] = [
  'owner-billing-plans',
  'owner-compliance-controls',
  'owner-usage-limits',
  'owner-backups',
  'owner-sso-configs',
  'owner-domains',
  'owner-incidents',
  'owner-maintenance-windows',
];

export async function listSuperAdminBatch2Records() {
  return listOwnerControlRecordGroup<OwnerRecord>(SUPER_ADMIN_BATCH_2_RESOURCES);
}

export default {
  ownerBillingPlans,
  ownerComplianceControls,
  ownerUsageLimits,
  ownerBackups,
  ownerSsoConfigs,
  ownerDomains,
  ownerIncidents,
  ownerMaintenanceWindows,
  listSuperAdminBatch2Records,
};
