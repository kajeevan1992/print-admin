'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { AccountKpiCard } from '@/components/account/account-kpi-card';
import { AccountQuickActions } from '@/components/account/account-quick-actions';
import { AccountOrdersPanel } from '@/components/account/account-orders-panel';
import { AccountProjectsPanel } from '@/components/account/account-projects-panel';
import { AccountSummaryPanel } from '@/components/account/account-summary-panel';

export default function AccountDashboardPage() {
  return (
    <PublicStorefrontLayout announcement="v118 customer account dashboard is now live with recent orders, saved projects, and account quick actions.">
      <StorefrontSection
        eyebrow="My account"
        title="Customer dashboard foundation"
        body="This account dashboard becomes the base for orders, approvals, saved projects, tracking, support, and profile flows."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <AccountKpiCard label="Open orders" value="3" hint="Across production, approval, and shipping states." />
          <AccountKpiCard label="Saved projects" value="12" hint="Reusable templates, uploads, and packaging concepts." />
          <AccountKpiCard label="Approval items" value="2" hint="Proofs or orders awaiting customer approval." />
          <AccountKpiCard label="Spend this month" value="£164" hint="Frontend demo value until real billing data is wired." />
        </div>

        <div className="mt-4">
          <AccountQuickActions />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_340px]">
          <AccountOrdersPanel />
          <AccountProjectsPanel />
          <AccountSummaryPanel />
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
