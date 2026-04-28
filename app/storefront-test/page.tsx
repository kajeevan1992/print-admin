'use client';

import { useEffect, useMemo, useState } from 'react';

type ProductOptionValue = Record<string, any> & {
  id?: string;
  label?: string;
  name?: string;
  isHidden?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

type ProductOptionGroup = Record<string, any> & {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  source?: string;
  displayType?: string;
  defaultValueId?: string;
  required?: boolean;
  values?: ProductOptionValue[];
  dependencyRules?: any[];
};

type ProductRecord = Record<string, any> & {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  optionGroups?: ProductOptionGroup[];
  metadataJson?: { optionGroups?: ProductOptionGroup[] };
};

function money(minor?: number, currency = 'GBP') {
  const value = Number(minor || 0) / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value);
}

function optionGroups(product?: ProductRecord | null): ProductOptionGroup[] {
  if (!product) return [];
  if (Array.isArray(product.optionGroups)) return product.optionGroups;
  if (Array.isArray(product.metadataJson?.optionGroups)) return product.metadataJson.optionGroups;
  return [];
}

function groupKey(group: ProductOptionGroup) {
  return String(group.key || group.pricingKey || group.source || group.id || group.name || group.label || 'option').trim();
}

function valueId(value: ProductOptionValue) {
  return String(value.id || value.sourceId || value.pricingKey || value.slug || value.label || value.name || '').trim();
}

function valueLabel(value: ProductOptionValue) {
  return String(value.label || value.name || value.title || value.pricingKey || value.id || 'Option').trim();
}

function visibleGroups(groups: ProductOptionGroup[], selections: Record<string, string>) {
  const allRules = groups.flatMap((group) => Array.isArray(group.dependencyRules) ? group.dependencyRules : []);
  return groups.filter((group) => {
    const key = groupKey(group);
    const hideRule = allRules.find((rule) => String(rule.targetGroupKey || '') === key && rule.action === 'hide' && selections[String(rule.whenGroupKey || '')] === String(rule.whenValueId || ''));
    const showRules = allRules.filter((rule) => String(rule.targetGroupKey || '') === key && rule.action === 'show');
    return !hideRule && (showRules.length === 0 || showRules.some((rule) => selections[String(rule.whenGroupKey || '')] === String(rule.whenValueId || '')));
  });
}

function defaultSelections(groups: ProductOptionGroup[]) {
  const selections: Record<string, string> = {};
  groups.forEach((group) => {
    const values = (group.values || []).filter((value) => !value.isHidden).sort((a, b) => Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999));
    const selected = values.find((value) => valueId(value) === String(group.defaultValueId || '')) || values.find((value) => value.isDefault) || values[0];
    if (selected) selections[groupKey(group)] = valueId(selected);
  });
  return selections;
}

export default function StorefrontTestPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<any>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/internal/catalog/products')
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        const items = json?.data?.items || json?.items || [];
        setProducts(Array.isArray(items) ? items : []);
        if (Array.isArray(items) && items[0]) setProductId(String(items[0].slug || items[0].id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load products.'))
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setError('');
    setPricing(null);
    fetch(`/api/internal/catalog/products/${encodeURIComponent(productId)}`)
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        const nextProduct = json?.data || json?.item || json;
        setProduct(nextProduct);
        setSelections(defaultSelections(optionGroups(nextProduct)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load product.'));
    return () => { active = false; };
  }, [productId]);

  const groups = useMemo(() => visibleGroups(optionGroups(product), selections), [product, selections]);

  async function calculatePrice() {
    if (!product) return;
    setError('');
    setPricing(null);
    const response = await fetch('/api/internal/catalog/pricing-final', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: product.slug || product.id, quantity, selections }),
    });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || 'Pricing failed.');
      return;
    }
    setPricing(json.data);
  }

  async function saveDraftOrder() {
    if (!product || !pricing) return;
    setDraftStatus('Saving draft order...');
    const response = await fetch('/api/internal/catalog/draft-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        quoteReference: `SF-${Date.now()}`,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        quantity,
        selections,
        currency: pricing.currency || product.currency || 'GBP',
        grossTotalMinor: pricing.sellPriceMinor || pricing.grossTotalMinor || 0,
        payload: {
          source: 'StorefrontTestPage',
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          quantity,
          selections,
          pricing,
        },
      }),
    });
    const json = await response.json();
    setDraftStatus(json.ok ? `Draft order saved: ${json.item?.title || json.item?.id || 'saved'}` : (json.error || 'Draft order failed.'));
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <div className="rounded-3xl border border-border bg-panel p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Live test rehearsal</p>
        <h1 className="mt-2 text-3xl font-semibold">Storefront Test</h1>
        <p className="mt-2 text-sm text-textMuted">Customer-style flow: product → option selection → live price → draft order.</p>
      </div>

      {loading && <div className="rounded-2xl border border-border bg-panel p-4 text-textMuted">Loading products...</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-border bg-panel p-5">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Product</span>
            <select className="rounded-xl border border-border bg-background px-3 py-2" value={productId} onChange={(event) => setProductId(event.target.value)}>
              {products.map((item) => (
                <option key={item.id} value={item.slug || item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="mt-4 grid gap-2 text-sm">
            <span className="font-medium">Quantity</span>
            <input className="rounded-xl border border-border bg-background px-3 py-2" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} />
          </label>

          <button className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100" onClick={calculatePrice} disabled={!product}>
            Calculate customer price
          </button>

          {pricing && (
            <button className="ml-2 mt-4 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100" onClick={saveDraftOrder}>
              Save as draft order
            </button>
          )}

          {draftStatus && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{draftStatus}</p>}
        </section>

        <section className="rounded-3xl border border-border bg-panel p-5">
          <h2 className="text-xl font-semibold">{product?.name || 'Select a product'}</h2>
          <p className="mt-2 text-sm text-textMuted">{product?.description || 'Configured storefront options appear below.'}</p>

          <div className="mt-5 space-y-4">
            {groups.length === 0 && <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">This product has no option groups yet. Configure options in Product Builder first.</p>}
            {groups.map((group) => {
              const key = groupKey(group);
              const values = (group.values || []).filter((value) => !value.isHidden).sort((a, b) => Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999));
              const displayType = String(group.displayType || group.display || 'dropdown');
              return (
                <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{group.name || group.label || key} {group.required && <span className="text-red-300">*</span>}</p>
                      {group.helpText && <p className="mt-1 text-xs text-textMuted">{group.helpText}</p>}
                    </div>
                    <span className="rounded-full border border-border px-2 py-1 text-[11px] text-textMuted">{displayType}</span>
                  </div>

                  {displayType.includes('card') || displayType.includes('image') || displayType.includes('grid') ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {values.map((value) => {
                        const id = valueId(value);
                        const active = selections[key] === id;
                        return (
                          <button key={id} className={`rounded-xl border p-3 text-left text-sm ${active ? 'border-emerald-400 bg-emerald-500/15' : 'border-border bg-background/40'}`} onClick={() => setSelections((prev) => ({ ...prev, [key]: id }))}>
                            <span className="font-medium">{valueLabel(value)}</span>
                            {(value.description || value.helpText) && <span className="mt-1 block text-xs text-textMuted">{value.description || value.helpText}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <select className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={selections[key] || ''} onChange={(event) => setSelections((prev) => ({ ...prev, [key]: event.target.value }))}>
                      {values.map((value) => <option key={valueId(value)} value={valueId(value)}>{valueLabel(value)}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {pricing && (
        <section className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/75">Customer price</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div><p className="text-xs text-emerald-100/75">Sell price</p><p className="text-2xl font-semibold">{money(pricing.sellPriceMinor || pricing.grossTotalMinor, pricing.currency)}</p></div>
            <div><p className="text-xs text-emerald-100/75">Unit price</p><p className="text-2xl font-semibold">{money(pricing.unitPriceMinor, pricing.currency)}</p></div>
            <div><p className="text-xs text-emerald-100/75">Cost</p><p className="text-2xl font-semibold">{money(pricing.costMinor, pricing.currency)}</p></div>
            <div><p className="text-xs text-emerald-100/75">Margin</p><p className="text-2xl font-semibold">{Number(pricing.marginPercent || 0).toFixed(1)}%</p></div>
          </div>
          {pricing.warnings?.length > 0 && <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">{pricing.warnings.join(' · ')}</div>}
        </section>
      )}

      <section className="rounded-3xl border border-border bg-panel p-5">
        <p className="text-sm font-medium">Debug selections</p>
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify({ productId, quantity, selections, pricing }, null, 2)}</pre>
      </section>
    </main>
  );
}
