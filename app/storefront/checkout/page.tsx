'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { CheckoutSteps } from '@/components/storefront/checkout-steps';
import { CheckoutAddressForm } from '@/components/storefront/checkout-address-form';
import { CheckoutShippingPayment } from '@/components/storefront/checkout-shipping-payment';
import { OrderSummaryPanel } from '@/components/storefront/order-summary-panel';

export default function StorefrontCheckoutPage() {
  return (
    <PublicStorefrontLayout announcement="v117 checkout frontend shell is now live and ready for later payment, shipping, and account integrations.">
      <StorefrontSection
        eyebrow="Checkout"
        title="Shared checkout frontend foundation"
        body="This build creates the reusable checkout shell for customer details, delivery, payment method selection, and final order review."
      >
        <CheckoutSteps current="details" />

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <CheckoutAddressForm />
            <CheckoutShippingPayment />

            <div
              className="rounded-3xl border p-5"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
            >
              <p className="text-sm font-semibold">Review and next steps</p>
              <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• later connect address autocomplete and validation</p>
                <p>• later connect payment provider and PO/account flows</p>
                <p>• later connect approvals, tax logic, and shipping integrations</p>
                <p>• later support quote-led and advanced packaging checkout branches</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <OrderSummaryPanel cta="Place order (shell)" />
            <div
              className="rounded-3xl border p-5 text-sm"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
            >
              This is a frontend shell only in v117. Real checkout logic, pricing, shipping, payments, and account rules come later during API/database integration.
            </div>
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
