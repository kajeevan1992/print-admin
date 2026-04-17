'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { LifecycleOrdersPanel } from '@/components/account/lifecycle-orders-panel';
import { LifecycleTimelinePanel } from '@/components/account/lifecycle-timeline-panel';
import { LifecycleSummaryPanel } from '@/components/account/lifecycle-summary-panel';

export default function OrderLifecyclePage() {
  return (
    <PublicStorefrontLayout announcement="v133 order lifecycle frontend is now live with end-to-end status tracking from artwork through delivery.">
      <StorefrontSection
        eyebrow="Order lifecycle"
        title="Order lifecycle frontend"
        body="This extends the storefront/customer portal toward a full production-aware order journey, from artwork checks through production, QA, dispatch, and delivery."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <LifecycleOrdersPanel />
          <div className="space-y-4">
            <LifecycleTimelinePanel />
            <LifecycleSummaryPanel />
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
