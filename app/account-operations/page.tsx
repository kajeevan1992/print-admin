'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { OrdersListPanel } from '@/components/account/orders-list-panel';
import { TrackingTimelinePanel } from '@/components/account/tracking-timeline-panel';
import { ApprovalsPanel } from '@/components/account/approvals-panel';

export default function AccountOperationsPage() {
  return (
    <PublicStorefrontLayout announcement="v119 orders, tracking, and approvals are now live on the customer-side frontend.">
      <StorefrontSection
        eyebrow="Operations"
        title="Orders, tracking, and approvals"
        body="This is the next customer-portal layer on top of the dashboard foundation. It covers order visibility, production progress, shipping states, and proof/approval tasks."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <OrdersListPanel />
          <TrackingTimelinePanel />
        </div>

        <div className="mt-4">
          <ApprovalsPanel />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
