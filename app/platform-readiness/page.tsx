'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { ReadinessDomainBoard } from '@/components/platform/readiness-domain-board';
import { ApiReadinessBoard } from '@/components/platform/api-readiness-board';
import { PlatformReadinessSummary } from '@/components/platform/platform-readiness-summary';

export default function PlatformReadinessPage() {
  return (
    <PublicStorefrontLayout announcement="v137 platform readiness hub is now live to bridge frontend completion into API and database implementation planning.">
      <StorefrontSection
        eyebrow="Implementation readiness"
        title="Platform readiness hub"
        body="This is the transition point between frontend completion and backend implementation. It maps the key data domains and API modules we should wire next."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <ReadinessDomainBoard />
            <ApiReadinessBoard />
          </div>
          <PlatformReadinessSummary />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
