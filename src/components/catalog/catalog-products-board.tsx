'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string;
  price: string;
};

const fallbackRows: ProductRow[] = [
  { id: 'prod-1', name: 'Standard Business Cards', slug: 'standard-business-cards', status: 'published', category: 'Print Products', price: '£19.00' },
  { id: 'prod-2', name: 'A5 Flyers', slug: 'a5-flyers', status: 'published', category: 'Print Products', price: '£29.00' },
  { id: 'prod-3', name: 'Mailer Boxes', slug: 'mailer-boxes', status: 'draft', category: 'Packaging', price: '£99.00' },
];

function formatMoney(value?: number | null, currency = 'GBP') {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function normalize(payload: any): ProductRow[] {
  const raw = payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((product: any, index: number) => ({
    id: product.id || `product-${index + 1}`,
    name: product.name || product.title || 'Product',
    slug: product.slug || `product-${index + 1}`,
    status: product.published === false ? 'draft' : product.status || 'published',
    category: product.category?.name || product.categoryName || 'Uncategorized',
    price: typeof product.priceFromMinor === 'number'
      ? formatMoney(product.priceFromMinor, product.currency || 'GBP')
      : typeof product.basePriceMinor === 'number'
      ? formatMoney(product.basePriceMinor, product.currency || 'GBP')
      : '—',
  }));
}

export function CatalogProductsBoard() {
  const [rows, setRows] = useState<ProductRow[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live products API...');
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [filter, setFilter] = useState('all');

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/catalog-products', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(fallbackRows);
        setSource('fallback');
        setMessage('Live products endpoint is not available yet. Showing fallback catalog rows.');
        return;
      }

      const normalized = normalize(payload);
      setRows(normalized.length ? normalized : fallbackRows);
      setSource(normalized.length ? 'live' : 'fallback');
      setMessage(
        normalized.length
          ? 'Connected to live products data.'
          : 'Products endpoint returned no rows. Showing fallback catalog rows.'
      );
    } catch {
      setRows(fallbackRows);
      setSource('fallback');
      setMessage('Could not reach the products endpoint. Showing fallback catalog rows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredRows = useMemo(
    () => rows.filter((row) => filter === 'all' || row.status === filter),
    [rows, filter]
  );

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Products</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Live-first catalog product overview for the admin system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
            Source: {source === 'live' ? 'Live API' : 'Fallback'}
          </span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            onClick={() => {
              setLoading(true);
              loadProducts();
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-2xl border px-4 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option value="all">All products</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
        {loading ? 'Loading products...' : message}
      </div>

      <div className="mt-4 space-y-3">
        {filteredRows.map((row) => (
          <div key={row.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{row.name}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.slug} · {row.category}
                </p>
              </div>
              <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
                {row.status}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Price</p>
                <p className="font-medium">{row.price}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Next step</p>
                <p className="font-medium">{row.status === 'draft' ? 'Publish product' : 'Refine rules and pricing'}</p>
              </div>
            </div>
          </div>
        ))}
        {!filteredRows.length ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
            No products match the selected filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
