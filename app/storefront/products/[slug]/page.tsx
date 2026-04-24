'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { ProductModeSwitch, type ProductMode } from '@/components/storefront/product-mode-switch';
import { ProductModeContent } from '@/components/storefront/product-mode-content';
import { ProductPreviewPanel } from '@/components/storefront/product-preview-panel';
import { ProductOptionsPanel } from '@/components/storefront/product-options-panel';
import { ProductPricingPanel } from '@/components/storefront/product-pricing-panel';
import { storefrontProducts } from '@/data/storefront-products';

export default function ProductDetailArchitecturePage({
  params
}: {
  params: { slug: string };
}) {
  const product = useMemo(
    () => storefrontProducts.find((item) => item.id === params.slug) ?? storefrontProducts[0],
    [params.slug]
  );

  const enabledModes = useMemo<ProductMode[]>(() => {
    const modes: ProductMode[] = [];
    if (product.uploadArtwork) modes.push('upload-artwork');
    if (product.onlineDesign) modes.push('customize-online');
    if (product.templateReady) modes.push('use-template');
    if (product.category === 'packaging' || product.priceFrom.toLowerCase().includes('quote')) modes.push('get-quote');
    return modes.length ? modes : ['get-quote'];
  }, [product]);

  const [mode, setMode] = useState<ProductMode>(enabledModes[0]);

  return (
    <PublicStorefrontLayout announcement="v116 product detail architecture is now live with mode-switch support for different buying paths.">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <Link href="/storefront" className="hover:opacity-90">Storefront</Link>
          <span>/</span>
          <Link href="/storefront/products" className="hover:opacity-90">Products</Link>
          <span>/</span>
          <span>{product.title}</span>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <ProductPreviewPanel />

          <div className="space-y-4">
            <div
              className="rounded-[2rem] border p-6"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
            >
              <p className="text-xs uppercase tracking-[0.28em]" style={{ color: 'var(--theme-text-muted)' }}>
                {product.category.replace('-', ' ')}
              </p>
              <h1 className="mt-3 text-3xl font-semibold">{product.title}</h1>
              <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{product.subtitle}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {product.badge ? (
                  <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
                    {product.badge}
                  </span>
                ) : null}
                <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
                  From {product.priceFrom}
                </span>
                <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
                  {product.turnaround}
                </span>
              </div>
            </div>

            <div
              className="rounded-[2rem] border p-6"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
            >
              <p className="mb-4 text-sm font-semibold">Choose how you want to buy this product</p>
              <ProductModeSwitch value={mode} onChange={setMode} enabledModes={enabledModes} />
            </div>

            <ProductModeContent mode={mode} />
            <ProductPricingPanel />
          </div>
        </div>
      </section>

      <StorefrontSection
        eyebrow="Configuration"
        title="Shared product detail structure"
        body="This architecture is intended to work for normal print products, template-based products, upload-driven products, and quote-led advanced product journeys."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <ProductOptionsPanel />
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
          >
            <p className="text-sm font-semibold">What this architecture supports</p>
            <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>• upload artwork path</p>
              <p>• online editor entry point</p>
              <p>• approved templates and saved projects</p>
              <p>• advanced quote-led products like packaging</p>
              <p>• future dynamic pricing and stock/service rules</p>
            </div>
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
