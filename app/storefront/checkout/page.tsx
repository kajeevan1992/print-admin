'use client';

import { useMemo, useState } from 'react';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { CheckoutSteps } from '@/components/storefront/checkout-steps';
import { CheckoutAddressForm } from '@/components/storefront/checkout-address-form';
import { CheckoutSelectionCards } from '@/components/storefront/checkout-selection-cards';
import { CheckoutReviewPanel } from '@/components/storefront/checkout-review-panel';
import { OrderSummaryPanel } from '@/components/storefront/order-summary-panel';
import { checkoutFoundation } from '@/data/checkout-foundation';

export default function StorefrontCheckoutPage() {
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');

  const shippingLabel = useMemo(
    () => checkoutFoundation.shippingMethods.find((item) => item.id === shippingMethod)?.label ?? 'Standard delivery',
    [shippingMethod]
  );

  const paymentLabel = useMemo(
    () => checkoutFoundation.paymentMethods.find((item) => item.id === paymentMethod)?.label ?? 'Card payment',
    [paymentMethod]
  );

  return (
    <PublicStorefrontLayout announcement="v131 cart and checkout foundation now includes selectable shipping, payment, and review states.">
      <StorefrontSection
        eyebrow="Checkout"
        title="Cart and checkout foundation"
        body="This is the practical checkout layer we can wire into APIs later. It now supports address entry, shipping/payment choice, and a structured review state."
      >
        <CheckoutSteps current="details" />

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <CheckoutAddressForm />

            <CheckoutSelectionCards
              title="Shipping method"
              value={shippingMethod}
              onChange={setShippingMethod}
              options={checkoutFoundation.shippingMethods}
            />

            <CheckoutSelectionCards
              title="Payment method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={checkoutFoundation.paymentMethods}
            />

            <CheckoutReviewPanel shippingLabel={shippingLabel} paymentLabel={paymentLabel} />

            <div
              className="rounded-3xl border p-5"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
            >
              <p className="text-sm font-semibold">What comes next</p>
              <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• connect address autocomplete and validation</p>
                <p>• connect payment provider, PO/account logic, and tenant checkout rules</p>
                <p>• connect approvals, tax logic, and shipping integrations</p>
                <p>• create real orders in the database from this flow</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <OrderSummaryPanel
              subtotal={checkoutFoundation.summary.subtotal}
              shipping={checkoutFoundation.summary.shipping}
              tax={checkoutFoundation.summary.tax}
              total={checkoutFoundation.summary.total}
              cta="Place order (foundation)"
            />
            <div
              className="rounded-3xl border p-5 text-sm"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
            >
              v131 keeps checkout frontend-only, but the structure is now much closer to the real API/database flow.
            </div>
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
