'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { TenantDomainControlBoard } from '@/components/super-admin/tenant-domain-control-board';
import { TenantDomainSummary } from '@/components/super-admin/tenant-domain-summary';

export default function SuperadminTenantDomainsPage() {
  return (
    <PublicStorefrontLayout announcement="v135 superadmin tenant/domain config UI is now live for platform-level tenant and domain visibility.">
      <StorefrontSection
        eyebrow="Superadmin"
        title="Tenant & domain configuration"
        body="This is the platform-control surface for managing tenant subdomains, custom domains, verification, SSL state, and primary-domain assignment."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <TenantDomainControlBoard />
          <TenantDomainSummary />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
