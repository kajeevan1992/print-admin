'use client';

import { useMemo, useState } from 'react';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { StorefrontProductCard } from '@/components/storefront/storefront-product-card';
import { StorefrontFilterBar } from '@/components/storefront/storefront-filter-bar';
import { CategoryCard } from '@/components/storefront/category-card';
import { storefrontCategories, storefrontProducts } from '@/data/storefront-products';

function priceToNumber(value: string) {
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export default function StorefrontProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = storefrontProducts.filter((item) => {
      const matchesQuery =
        !q ||
        [item.title, item.subtitle, item.category, item.badge ?? ''].join(' ').toLowerCase().includes(q);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesQuery && matchesCategory;
    });

    if (sort == 'popular') {
      rows = [...rows].sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)));
    } else if (sort == 'price-asc') {
      rows = [...rows].sort((a, b) => priceToNumber(a.priceFrom) - priceToNumber(b.priceFrom));
    } else if (sort == 'price-desc') {
      rows = [...rows].sort((a, b) => priceToNumber(b.priceFrom) - priceToNumber(a.priceFrom));
    }

    return rows;
  }, [search, category, sort]);

  return (
    <PublicStorefrontLayout announcement="v115 product browsing flow is now live with search, category filters, and product listing states.">
      <StorefrontSection
        eyebrow="Product browsing"
        title="Browse products by category, use case, and buying path"
        body="This build turns the storefront shell into a practical browsing flow with reusable category cards, filters, sorting, and richer product cards."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {storefrontCategories.slice(0, 3).map((item) => (
            <CategoryCard key={item.id} title={item.label} description={item.description} />
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection
        eyebrow="Browse all products"
        title="Find the right print product faster"
        body="This listing model will be reused for category pages, product search, marketing landing pages, and future client-specific storefront variants."
      >
        <StorefrontFilterBar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          sort={sort}
          setSort={setSort}
          categories={storefrontCategories.map((item) => ({ id: item.id, label: item.label }))}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((item) => (
            <StorefrontProductCard
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              price={item.priceFrom}
              badge={item.badge}
              turnaround={item.turnaround}
              features={[
                item.onlineDesign ? 'Online design' : null,
                item.uploadArtwork ? 'Upload artwork' : null,
                item.templateReady ? 'Templates' : null
              ].filter(Boolean) as string[]}
            />
          ))}
        </div>

        {!filteredProducts.length ? (
          <div
            className="mt-5 rounded-3xl border p-6 text-sm"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
          >
            No products match the current search or category filters.
          </div>
        ) : null}
      </StorefrontSection>

      <StorefrontSection
        eyebrow="Browse by workflow"
        title="Support multiple print buying paths"
        body="The same product architecture will support upload artwork, online customization, templates, and quote-led advanced product journeys."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Upload artwork', 'Best for print-ready customers who already have final files.'],
            ['Customize online', 'Best for quick personalization and standardized branded products.'],
            ['Use template', 'Best for controlled layouts, offline templates, and repeatable assets.'],
            ['Quote-led advanced', 'Best for packaging, special finishes, or custom-spec work.']
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
