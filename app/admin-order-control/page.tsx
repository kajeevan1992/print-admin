'use client';

import { StorefrontSection } from '@/components/storefront/storefront-section';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { AdminOrderControlBoard } from '@/components/admin/admin-order-control-board';
import { AdminOrderControlSummary } from '@/components/admin/admin-order-control-summary';

export default function AdminOrderControlPage() {
  return (
    <PublicStorefrontLayout announcement="v134 admin order control panel is now live for internal workflow visibility and job progression.">
      <StorefrontSection
        eyebrow="Admin operations"
        title="Admin order control panel"
        body="This is the internal-facing control surface for reviewing incoming jobs, artwork states, approvals, production stages, and dispatch readiness."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <AdminOrderControlBoard />
          <AdminOrderControlSummary />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
