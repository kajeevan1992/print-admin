'use client';

import Link from 'next/link';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { StorefrontProductCard } from '@/components/storefront/storefront-product-card';
import { useTenantTheme } from '@/providers/theme-provider';

export default function StorefrontHomePage() {
  const { config } = useTenantTheme();

  return (
    <PublicStorefrontLayout announcement="v114 public storefront shell is now live and ready for customer-side builds.">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1.25fr_0.75fr]">
        <div
          className="rounded-[2rem] border p-8"
          style={{ borderColor: 'var(--theme-border)', background: 'linear-gradient(135deg, var(--theme-surface), var(--theme-surface-alt))' }}
        >
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--theme-text-muted)' }}>
            White-label storefront
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Reusable print commerce frontend for {config.tenantName}.
          </h1>
          <p className="mt-4 max-w-2xl text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            This storefront shell is the new base for product browsing, category pages, product detail flows, checkout,
            templates, uploads, and customer account experiences.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/storefront/products"
              className="rounded-full px-5 py-3 text-sm font-medium"
              style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
            >
              Browse all products
            </Link>
            <Link
              href="/storefront/upload-artwork"
              className="rounded-full border px-5 py-3 text-sm"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              Upload artwork
            </Link>
            <Link
              href="/storefront-isolation"
              className="rounded-full border px-5 py-3 text-sm"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              Storefront isolation
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border p-6" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
            <p className="text-sm font-semibold">What v114 adds</p>
            <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>• public storefront header/footer/navigation</p>
              <p>• homepage hero and marketing sections</p>
              <p>• reusable product cards and section blocks</p>
              <p>• starter routes for products, templates, upload artwork, and cart</p>
            </div>
          </div>
          <div className="rounded-[2rem] border p-6" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
            <p className="text-sm font-semibold">Next customer builds</p>
            <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>• product browsing flow</p>
              <p>• product detail architecture</p>
              <p>• cart and checkout</p>
              <p>• account dashboard and orders</p>
            </div>
          </div>
        </div>
      </section>

      <StorefrontSection
        eyebrow="Popular categories"
        title="Commerce-ready storefront sections"
        body="These blocks are reusable across theme variants and client-branded storefront implementations."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StorefrontProductCard title="Business Cards" subtitle="Fast-turn cards with upload or online customization flow." price="From £19" badge="Top seller" />
          <StorefrontProductCard title="Marketing Flyers" subtitle="Promotional print with reusable templates and campaign layouts." price="From £29" badge="Campaign" />
          <StorefrontProductCard title="Custom Packaging" subtitle="Advanced product path for parametric packaging and quote-led ordering." price="Quote / From £89" badge="Advanced" />
        </div>
      </StorefrontSection>

      <StorefrontSection
        eyebrow="Customer journey"
        title="Built for multiple print buying paths"
        body="The storefront is being structured so one product can support upload, online design, template-driven, or quote-first flows."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Browse', 'Customers find products through category-first navigation and reusable listing layouts.'],
            ['Choose flow', 'Each product can branch into upload artwork, use template, customize online, or request quote.'],
            ['Checkout', 'Shared commerce shell will support shipping, payment, PO/invoice, and approval states.'],
            ['Track & reorder', 'Account area will handle projects, approvals, tracking, and repeat ordering.']
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{body}</p>
            </div>
          ))}
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
