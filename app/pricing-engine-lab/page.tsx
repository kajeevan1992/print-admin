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

type PricingGroupValue = {
  id: string;
  label: string;
  pricingKey?: string;
  role?: string;
  basis?: string;
  quantity?: number;
  width?: number;
  height?: number;
  setupCostMinor?: number;
  runCostMinor?: number;
  minChargeMinor?: number;
  pricingMultiplier?: number;
  productionCode?: string;
};

type PricingGroupSummary = {
  key: string;
  name: string;
  source?: string;
  role: string;
  basis: string;
  unit?: string;
  formulaHint?: string;
  valueCount: number;
  values: PricingGroupValue[];
};

type PricingInputSummary = {
  productId: string;
  productSlug: string;
  productName: string;
  ready: boolean;
  missingRoles: string[];
  groups: PricingGroupSummary[];
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

function displayGroupName(group: PricingGroupSummary) {
  return group.name || group.key || group.role || 'Option group';
}

function valueDisplay(value: PricingGroupValue) {
  const extras = [
    value.width && value.height ? `${value.width}×${value.height}` : '',
    value.quantity ? `qty ${value.quantity}` : '',
    value.productionCode ? `code ${value.productionCode}` : '',
  ].filter(Boolean);
  return `${value.label || value.id}${extras.length ? ` · ${extras.join(' · ')}` : ''}`;
}

function groupSelectionKey(group: PricingGroupSummary) {
  return group.key || group.role || group.name;
}

function defaultValueForGroup(group: PricingGroupSummary) {
  return group.values[0]?.id || group.values[0]?.pricingKey || group.values[0]?.label || '';
}

export default function Page() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [pricingSummaries, setPricingSummaries] = useState<PricingInputSummary[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [selectionJson, setSelectionJson] = useState('{}');
  const [visualSelections, setVisualSelections] = useState<Record<string, string>>({});
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
        const [productsResponse, reportResponse] = await Promise.all([
          fetch('/api/internal/catalog/products?limit=200', { cache: 'no-store' }),
          fetch('/api/internal/catalog/pricing-input-report', { cache: 'no-store' }).catch(() => null),
        ]);
        const productsPayload = await productsResponse.json().catch(() => ({}));
        if (!productsResponse.ok || productsPayload.ok === false) throw new Error(productsPayload.error || 'Unable to load products.');
        const items = Array.isArray(productsPayload?.data?.items) ? productsPayload.data.items.map(normaliseProduct).filter((item: ProductOption) => item.id) : [];

        let summaries: PricingInputSummary[] = [];
        if (reportResponse) {
          const reportPayload = await reportResponse.json().catch(() => ({}));
          if (reportResponse.ok && reportPayload.ok !== false && Array.isArray(reportPayload?.data?.items)) summaries = reportPayload.data.items;
        }

        if (!cancelled) {
          setProducts(items);
          setPricingSummaries(summaries);
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
  const selectedSummary = useMemo(() => {
    return pricingSummaries.find((item) => [item.productId, item.productSlug].filter(Boolean).includes(productId));
  }, [pricingSummaries, productId]);
  const selectableGroups = useMemo(() => (selectedSummary?.groups || []).filter((group) => group.values.length > 0), [selectedSummary]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const group of selectableGroups) {
      const key = groupSelectionKey(group);
      if (key) next[key] = defaultValueForGroup(group);
    }
    setVisualSelections(next);
    setDiagnostics(null);
  }, [productId, selectableGroups]);

  function visualSelectionsToJson(nextSelections = visualSelections) {
    const output: Record<string, string> = {};
    for (const group of selectableGroups) {
      const key = groupSelectionKey(group);
      const value = nextSelections[key];
      if (key && value) output[key] = value;
    }
    return output;
  }

  function syncJsonFromVisual(nextSelections = visualSelections) {
    setSelectionJson(JSON.stringify(visualSelectionsToJson(nextSelections), null, 2));
  }

  function updateVisualSelection(key: string, value: string) {
    const next = { ...visualSelections, [key]: value };
    setVisualSelections(next);
    setSelectionJson(JSON.stringify(visualSelectionsToJson(next), null, 2));
  }

  async function runDiagnostics(useVisual = false) {
    setRunning(true);
    setError('');
    setDiagnostics(null);
    try {
      let selections: Record<string, unknown> = {};
      if (useVisual) {
        selections = visualSelectionsToJson();
        setSelectionJson(JSON.stringify(selections, null, 2));
      } else {
        try {
          selections = selectionJson.trim() ? JSON.parse(selectionJson) : {};
        } catch {
          throw new Error('Customer selections must be valid JSON, for example {"material":"silk-350"}.');
        }
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
  const quoteLines = Array.isArray(diagnostics?.pricing?.calculation?.quoteInput?.lines) ? diagnostics?.pricing?.calculation?.quoteInput?.lines : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing Engine Lab" subtitle="Test a real product against the internal pricing chain: selections → production estimate → cost breakdown → final price → diagnostics." />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Pricing test bench</p>
            <p className="mt-1 text-xs text-textMuted">Uses live products, product option groups, and the internal pricing diagnostics API. No storefront or order flow changes.</p>
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

        {selectedSummary ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Product option selector</p>
                <p className="mt-1 text-xs text-textMuted">Select customer-facing options here; the lab converts them into the same JSON payload the storefront will send later.</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${selectedSummary.ready ? statusClass('ready') : statusClass('warning')}`}>
                {selectedSummary.ready ? 'PRICING INPUT READY' : `MISSING: ${selectedSummary.missingRoles.join(', ') || 'CONFIG'}`}
              </span>
            </div>

            {selectableGroups.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {selectableGroups.map((group) => {
                  const key = groupSelectionKey(group);
                  return (
                    <label key={key || displayGroupName(group)} className="space-y-2">
                      <span className="text-sm font-medium text-text">{displayGroupName(group)}</span>
                      <Select
                        value={visualSelections[key] || ''}
                        onChange={(event) => updateVisualSelection(key, event.target.value)}
                        options={group.values.map((value) => ({ value: value.id || value.pricingKey || value.label, label: valueDisplay(value) }))}
                      />
                      <p className="text-[11px] text-textMuted">Role: {group.role || 'not set'} · Basis: {group.basis || 'not set'}{group.unit ? ` · Unit: ${group.unit}` : ''}</p>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">This product has no selectable option values yet. Add option groups/values in Product Builder before testing realistic customer pricing.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => syncJsonFromVisual()}>Copy selected options to JSON</Button>
              <PrimaryButton onClick={() => runDiagnostics(true)} disabled={!productId || running || loadingProducts}>{running ? 'Running…' : 'Run with selected options'}</PrimaryButton>
            </div>
          </div>
        ) : selectedProduct ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">No pricing input summary was returned for this product yet. You can still test manually with JSON below.</div>
        ) : null}

        <label className="space-y-2 block">
          <span className="text-sm font-medium text-text">Customer selections JSON</span>
          <textarea
            value={selectionJson}
            onChange={(event) => setSelectionJson(event.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
            placeholder='{"size":"85x55", "material":"350gsm-silk", "finish":"matt-laminate", "turnaround":"standard"}'
          />
          <p className="text-xs text-textMuted">Leave as {`{}`} to test product defaults, or use the selector above to generate a realistic customer selection payload.</p>
        </label>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => runDiagnostics(false)} disabled={!productId || running || loadingProducts}>{running ? 'Running…' : 'Run JSON diagnostics'}</PrimaryButton>
          <Button type="button" onClick={() => { setSelectionJson('{}'); setDiagnostics(null); }}>Reset selections</Button>
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
            <h2 className="text-sm font-semibold text-white">Resolved pricing inputs</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-textMuted">
                  <tr><th className="py-2 pr-4">Group</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Selected</th><th className="py-2 pr-4">Basis</th><th className="py-2 pr-4">Setup</th><th className="py-2 pr-4">Run</th><th className="py-2 pr-4">Multiplier</th></tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {quoteLines.length ? quoteLines.map((line: any, index: number) => (
                    <tr key={`${line.groupKey || line.groupName}-${index}`} className="text-textMuted">
                      <td className="py-2 pr-4 text-white">{line.groupName || line.groupKey}</td>
                      <td className="py-2 pr-4">{line.role || '—'}</td>
                      <td className="py-2 pr-4">{line.selectedLabel || line.selectedId || String(line.selectedValue || '—')}</td>
                      <td className="py-2 pr-4">{line.basis || '—'}</td>
                      <td className="py-2 pr-4">{money(line.setupCostMinor, diagnostics.currency)}</td>
                      <td className="py-2 pr-4">{money(line.runCostMinor, diagnostics.currency)}</td>
                      <td className="py-2 pr-4">{line.pricingMultiplier ?? '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="py-4 text-textMuted">No pricing input lines returned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

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
          <p className="text-sm text-textMuted">Select a product and run diagnostics to see final price, resolved option inputs, cost lines, production estimate, warnings, and blocked pricing reasons.</p>
        </Card>
      )}
    </div>
  );
}
