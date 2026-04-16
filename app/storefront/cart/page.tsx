'use client';

import Link from 'next/link';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { CartItemCard } from '@/components/storefront/cart-item-card';
import { CheckoutSteps } from '@/components/storefront/checkout-steps';
import { OrderSummaryPanel } from '@/components/storefront/order-summary-panel';
import { storefrontCartSeed } from '@/data/storefront-cart';

export default function StorefrontCartPage() {
  return (
    <PublicStorefrontLayout announcement="v117 cart and checkout frontend is now live with reusable cart and order summary shells.">
      <StorefrontSection
        eyebrow="Cart"
        title="Review your items before checkout"
        body="This cart layout is the shared base for standard orders, approval-led orders, and future real checkout/payment connections."
      >
        <CheckoutSteps current="cart" />

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {storefrontCartSeed.map((item) => (
              <CartItemCard
                key={item.id}
                title={item.title}
                variant={item.variant}
                quantity={item.quantity}
                turnaround={item.turnaround}
                subtotal={`£${item.subtotal.toFixed(2)}`}
              />
            ))}
          </div>

          <div className="space-y-4">
            <OrderSummaryPanel cta="Proceed to checkout" />
            <div
              className="rounded-3xl border p-5 text-sm"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
            >
              <p className="font-medium" style={{ color: 'var(--theme-text)' }}>Need a quote-led or approval-led path?</p>
              <p className="mt-2">This checkout foundation will later support PO, invoice accounts, approvals, and advanced product routes.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/storefront/products"
            className="rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          >
            Continue shopping
          </Link>
          <Link
            href="/storefront/checkout"
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
          >
            Checkout shell
          </Link>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
