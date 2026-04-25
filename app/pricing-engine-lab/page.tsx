'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { PrimaryButton, Button } from '@/components/ui/buttons';

type ProductOption = {
  id: string;
  slug?: string;
  name?: string;
  title?: string;
  categoryName?: string;
};

type DiagnosticCheck = {
  key: string;
  label: string;
  severity: 'ok' | 'warning' | 'error';
  message: string;
};

type PricingDiagnostics = {
  status: 'ready' | 'warnings' | 'blocked';
  productName: string;
  productSlug: string;
  quantity: number;
  currency: string;
  finalPriceMinor: number;
  unitPriceMinor: number;
  checks: DiagnosticCheck[];
  pricing?: any;
};

function money(minor?: number, currency = 'GBP') {
  const value = Number(minor || 0) / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(value);
}

function normaliseProduct(item: any): ProductOption {
  return {
    id: String(item?.id || item?.slug || ''),
    slug: item?.slug ? String(item.slug) : undefined,
    name: item?.name || item?.title,
    title: item?.title || item?.name,
    categoryName: item?.categoryName,
  };
}

function statusClass(status?: string) {
  if (status === 'ready' || status === 'ok') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  if (status === 'blocked' || status === 'error') return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
  return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
}

export default function Page() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [selectionJson, setSelectionJson] = useState('{}');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [diagnostics, setDiagnostics] = useState<PricingDiagnostics | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setLoadingProducts(true);
      setError('');
      try {
        const response = await fetch('/api/internal/catalog/products?limit=200', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Unable to load products.');
        const items = Array.isArray(payload?.data?.items) ? payload.data.items.map(normaliseProduct).filter((item: ProductOption) => item.id) : [];
        if (!cancelled) {
          setProducts(items);
          setProductId((current) => current || items[0]?.slug || items[0]?.id || '');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load products.');
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProduct = useMemo(() => products.find((item) => item.id === productId || item.slug === productId), [products, productId]);

  async function runDiagnostics() {
    setRunning(true);
    setError('');
    setDiagnostics(null);
    try {
      let selections: Record<string, unknown> = {};
      try {
        selections = selectionJson.trim() ? JSON.parse(selectionJson) : {};
      } catch {
        throw new Error('Customer selections must be valid JSON, for example {"material":"silk-350"}.');
      }

      const response = await fetch('/api/internal/catalog/pricing-diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: Number(quantity) || 1, selections }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Pricing diagnostics failed.');
      setDiagnostics(payload.data as PricingDiagnostics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pricing diagnostics failed.');
    } finally {
      setRunning(false);
    }
  }

  const checks = diagnostics?.checks || [];
  const costLines = Array.isArray(diagnostics?.pricing?.calculation?.costBreakdown?.lines) ? diagnostics?.pricing?.calculation?.costBreakdown?.lines : [];
  const adjustments = Array.isArray(diagnostics?.pricing?.adjustments) ? diagnostics?.pricing?.adjustments : [];
  const estimate = diagnostics?.pricing?.calculation?.productionEstimate;

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing Engine Lab" subtitle="Test a real product against the internal pricing chain: selections → production estimate → cost breakdown → final price → diagnostics." />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Pricing test bench</p>
            <p className="mt-1 text-xs text-textMuted">Uses live products and the internal pricing diagnostics API. No storefront or order flow changes.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(diagnostics?.status)}`}>
            {diagnostics ? diagnostics.status.toUpperCase() : loadingProducts ? 'LOADING PRODUCTS' : 'READY TO TEST'}
          </span>
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text">Product</span>
            <Select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={loadingProducts || products.length === 0}
              options={products.length ? products.map((item) => ({ value: item.slug || item.id, label: `${item.title || item.name || item.id}${item.categoryName ? ` · ${item.categoryName}` : ''}` })) : [{ value: '', label: 'No products found' }]}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text">Quantity</span>
            <Input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-medium text-text">Customer selections JSON</span>
          <textarea
            value={selectionJson}
            onChange={(event) => setSelectionJson(event.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
            placeholder='{"size":"85x55", "material":"350gsm-silk", "finish":"matt-laminate", "turnaround":"standard"}'
          />
          <p className="text-xs text-textMuted">Leave as {`{}`} to test product defaults. Later this will be generated from the customer product page.</p>
        </label>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={runDiagnostics} disabled={!productId || running || loadingProducts}>{running ? 'Running…' : 'Run pricing diagnostics'}</PrimaryButton>
          <Button type="button" onClick={() => setSelectionJson('{}')}>Reset selections</Button>
        </div>
      </Card>

      {diagnostics ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Final price</p>
              <p className="mt-2 text-2xl font-semibold text-white">{money(diagnostics.finalPriceMinor, diagnostics.currency)}</p>
              <p className="mt-1 text-xs text-textMuted">For {diagnostics.quantity} unit(s)</p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Unit price</p>
              <p className="mt-2 text-2xl font-semibold text-white">{money(diagnostics.unitPriceMinor, diagnostics.currency)}</p>
              <p className="mt-1 text-xs text-textMuted">Rounded output</p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Cost</p>
              <p className="mt-2 text-2xl font-semibold text-white">{money(diagnostics.pricing?.costMinor, diagnostics.currency)}</p>
              <p className="mt-1 text-xs text-textMuted">Before final rules</p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Checks</p>
              <p className="mt-2 text-2xl font-semibold text-white">{checks.filter((item) => item.severity === 'error').length} / {checks.filter((item) => item.severity === 'warning').length}</p>
              <p className="mt-1 text-xs text-textMuted">Errors / warnings</p>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Diagnostics</h2>
              <div className="space-y-2">
                {checks.map((check) => (
                  <div key={check.key} className={`rounded-2xl border p-3 ${statusClass(check.severity)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{check.label}</p>
                      <span className="text-[11px] uppercase tracking-[0.18em]">{check.severity}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-90">{check.message}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-white">Production estimate</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Product kind</p><p className="mt-1 text-sm text-white">{estimate?.productKind || 'Not set'}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Source units</p><p className="mt-1 text-sm text-white">{estimate?.sourceUnitsRequired ?? '—'}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Impressions</p><p className="mt-1 text-sm text-white">{estimate?.impressions ?? '—'}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Ups per source</p><p className="mt-1 text-sm text-white">{estimate?.upsPerSource ?? '—'}</p></div>
              </div>

              <h2 className="pt-2 text-sm font-semibold text-white">Applied final pricing rules</h2>
              <div className="space-y-2">
                {adjustments.length ? adjustments.map((item: any, index: number) => (
                  <div key={`${item.key}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted">
                    <div className="flex items-center justify-between gap-3"><span className="text-white">{item.label || item.key}</span><span>{money(item.amountMinor, diagnostics.currency)}</span></div>
                    <p className="mt-1">{money(item.beforeMinor, diagnostics.currency)} → {money(item.afterMinor, diagnostics.currency)}</p>
                  </div>
                )) : <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">No final pricing rules applied yet.</p>}
              </div>
            </Card>
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Cost breakdown lines</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-textMuted">
                  <tr><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Label</th><th className="py-2 pr-4">Qty</th><th className="py-2 pr-4">Unit</th><th className="py-2 pr-4">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {costLines.length ? costLines.map((line: any, index: number) => (
                    <tr key={`${line.key || line.label}-${index}`} className="text-textMuted">
                      <td className="py-2 pr-4 text-white">{line.type || 'line'}</td>
                      <td className="py-2 pr-4">{line.label || line.key || 'Cost line'}</td>
                      <td className="py-2 pr-4">{line.quantity ?? '—'}</td>
                      <td className="py-2 pr-4">{money(line.unitMinor, diagnostics.currency)}</td>
                      <td className="py-2 pr-4 text-white">{money(line.totalMinor, diagnostics.currency)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-4 text-textMuted">No cost lines returned. Add pricing setup/run costs or product base price.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-textMuted">Select a product and run diagnostics to see final price, cost lines, production estimate, warnings, and blocked pricing reasons.</p>
        </Card>
      )}
    </div>
  );
}
