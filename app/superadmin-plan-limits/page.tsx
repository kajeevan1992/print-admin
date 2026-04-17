'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { TenantPlanControlBoard } from '@/components/super-admin/tenant-plan-control-board';
import { TenantPlanSummary } from '@/components/super-admin/tenant-plan-summary';

export default function SuperadminPlanLimitsPage() {
  return (
    <PublicStorefrontLayout announcement="v136 superadmin plan limits and activation UI is now live for platform-level tenant access control visibility.">
      <StorefrontSection
        eyebrow="Superadmin"
        title="Tenant activation & plan limits"
        body="This is the platform-control surface for plan tier, activation state, usage caps, billing readiness, and future tenant provisioning hooks."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <TenantPlanControlBoard />
          <TenantPlanSummary />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
