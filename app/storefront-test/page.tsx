'use client';

import { useEffect, useMemo, useState } from 'react';

type ProductOptionValue = Record<string, any> & {
  id?: string;
  label?: string;
  name?: string;
  isHidden?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  description?: string;
  helpText?: string;
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
  minQuantity?: number;
  maxQuantity?: number;
  quantityStep?: number;
  values?: ProductOptionValue[];
  dependencyRules?: any[];
};

type ProductRecord = Record<string, any> & {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  currency?: string;
  optionGroups?: ProductOptionGroup[];
  metadataJson?: { optionGroups?: ProductOptionGroup[] };
};

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  company: string;
};

type ArtworkUpload = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  uploadedAt: string;
  notes?: string;
};

function money(minor?: number, currency = 'GBP') {
  const value = Number(minor || 0) / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value);
}

function cartTotal(items: any[]) {
  return items.reduce((sum, item) => sum + Number(item.grossTotalMinor || item.pricing?.sellPriceMinor || item.pricing?.grossTotalMinor || 0), 0);
}

function cartVatTotal(items: any[]) {
  return items.reduce((sum, item) => sum + Number(item.pricing?.vatMinor || item.pricing?.vatTotalMinor || item.vatMinor || 0), 0);
}

function cartNetTotal(items: any[]) {
  return items.reduce((sum, item) => {
    const gross = Number(item.grossTotalMinor || item.pricing?.sellPriceMinor || item.pricing?.grossTotalMinor || 0);
    const vat = Number(item.pricing?.vatMinor || item.pricing?.vatTotalMinor || item.vatMinor || 0);
    return sum + Math.max(0, gross - vat);
  }, 0);
}

function itemArtwork(item: any): ArtworkUpload[] {
  const uploads = item?.artworkUploads || item?.artwork?.uploads || [];
  return Array.isArray(uploads) ? uploads : [];
}

function cartArtworkCount(items: any[]) {
  return items.reduce((sum, item) => sum + itemArtwork(item).length, 0);
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

function sortedValues(group: ProductOptionGroup) {
  return (group.values || [])
    .filter((value) => !value.isHidden)
    .sort((a, b) => Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999));
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
    const values = sortedValues(group);
    const selected = values.find((value) => valueId(value) === String(group.defaultValueId || '')) || values.find((value) => value.isDefault) || values[0];
    if (selected) selections[groupKey(group)] = valueId(selected);
  });
  return selections;
}

function validateSelections(groups: ProductOptionGroup[], selections: Record<string, string>, quantity: number) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(quantity) || quantity < 1) errors.push('Quantity must be at least 1.');

  groups.forEach((group) => {
    const key = groupKey(group);
    const values = sortedValues(group);
    const selected = selections[key];
    if (group.required && !selected) errors.push(`${group.name || group.label || key} is required.`);
    if (selected && !values.some((value) => valueId(value) === selected)) errors.push(`${group.name || group.label || key} has an invalid selection.`);
    if (values.length === 0) warnings.push(`${group.name || group.label || key} has no visible values.`);
  });

  const quantityGroup = groups.find((group) => ['quantity', 'qty'].includes(groupKey(group).toLowerCase()) || String(group.source || '').toLowerCase() === 'quantity');
  if (quantityGroup) {
    const min = Number(quantityGroup.minQuantity || quantityGroup.min || 0);
    const max = Number(quantityGroup.maxQuantity || quantityGroup.max || 0);
    const step = Number(quantityGroup.quantityStep || quantityGroup.step || 0);
    if (min > 0 && quantity < min) errors.push(`Quantity is below the product minimum of ${min}.`);
    if (max > 0 && quantity > max) errors.push(`Quantity is above the product maximum of ${max}.`);
    if (step > 1 && quantity % step !== 0) warnings.push(`Quantity step is ${step}; check this quantity is allowed.`);
  }

  return { errors, warnings };
}

export default function StorefrontTestPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<any>(null);
  const [cartStatus, setCartStatus] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [draftStatus, setDraftStatus] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [orderPipelineStatus, setOrderPipelineStatus] = useState('');
  const [pipelineOrders, setPipelineOrders] = useState<any[]>([]);
  const [productionJobs, setProductionJobs] = useState<any[]>([]);
  const [productionStatus, setProductionStatus] = useState('');
  const [confirmedDraft, setConfirmedDraft] = useState<any>(null);
  const [artworkStatus, setArtworkStatus] = useState('');
  const [artworkNotes, setArtworkNotes] = useState<Record<string, string>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetails>({ name: '', email: '', phone: '', company: '' });
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
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

  async function loadCart() {
    try {
      const response = await fetch('/api/internal/catalog/storefront-cart', { cache: 'no-store' });
      const json = await response.json();
      setCartItems(Array.isArray(json?.data?.items) ? json.data.items : []);
    } catch (err) {
      setCartStatus(err instanceof Error ? err.message : 'Could not load cart.');
    }
  }

  async function loadPipelineOrders() {
    try {
      const response = await fetch('/api/internal/catalog/order-pipeline', { cache: 'no-store' });
      const json = await response.json();
      setPipelineOrders(Array.isArray(json?.data?.items) ? json.data.items : []);
    } catch (err) {
      setOrderPipelineStatus(err instanceof Error ? err.message : 'Could not load order pipeline.');
    }
  }

  async function loadProductionJobs() {
    try {
      const response = await fetch('/api/internal/catalog/production-flow', { cache: 'no-store' });
      const json = await response.json();
      setProductionJobs(Array.isArray(json?.data?.items) ? json.data.items : []);
    } catch (err) {
      setProductionStatus(err instanceof Error ? err.message : 'Could not load production flow.');
    }
  }

  useEffect(() => {
    loadCart();
    loadPipelineOrders();
    loadProductionJobs();
  }, []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setError('');
    setPricing(null);
    setDraftStatus('');
    setCheckoutStatus('');
    setOrderPipelineStatus('');
    setProductionStatus('');
    setConfirmedDraft(null);
    setArtworkStatus('');
    setCartStatus('');
    setProductLoading(true);
    fetch(`/api/internal/catalog/products/${encodeURIComponent(productId)}`)
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        const nextProduct = json?.data || json?.item || json;
        setProduct(nextProduct);
        setSelections(defaultSelections(optionGroups(nextProduct)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load product.'))
      .finally(() => setProductLoading(false));
    return () => { active = false; };
  }, [productId]);

  const rawGroups = useMemo(() => optionGroups(product), [product]);
  const groups = useMemo(() => visibleGroups(rawGroups, selections), [rawGroups, selections]);
  const validation = useMemo(() => validateSelections(groups, selections, quantity), [groups, selections, quantity]);
  const canPrice = Boolean(product) && validation.errors.length === 0;

  async function calculatePrice() {
    if (!product) return;
    setError('');
    setDraftStatus('');
    setCartStatus('');
    if (validation.errors.length > 0) {
      setError(validation.errors.join(' '));
      return;
    }
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

  function baseOrderPayload(source: string) {
    if (!product || !pricing) return null;
    return {
      source,
      quoteReference: `SF-${Date.now()}`,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      quantity,
      selections,
      currency: pricing.currency || product.currency || 'GBP',
      grossTotalMinor: pricing.sellPriceMinor || pricing.grossTotalMinor || 0,
      unitPriceMinor: pricing.unitPriceMinor || 0,
      pricing,
      validation,
      createdAt: new Date().toISOString(),
    };
  }

  async function saveCartItem() {
    const payload = baseOrderPayload('StorefrontTestCart');
    if (!payload) return;
    setCartStatus('Saving cart item...');
    const response = await fetch('/api/internal/catalog/storefront-cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setCartStatus(json.ok ? `Cart item saved: ${json.item?.title || json.item?.id || 'saved'}` : (json.error || 'Cart save failed.'));
    if (json.ok) await loadCart();
  }

  async function updateCartQuantity(item: any, nextQuantity: number) {
    const quantityValue = Math.max(1, Number(nextQuantity || 1));
    setCartStatus('Updating cart item...');
    const response = await fetch('/api/internal/catalog/storefront-cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...item, id: item.id, quantity: quantityValue, title: `${item.productName || item.productSlug || item.productId || 'Cart item'} x ${quantityValue}` }),
    });
    const json = await response.json();
    setCartStatus(json.ok ? 'Cart item updated.' : (json.error || 'Cart update failed.'));
    if (json.ok) await loadCart();
  }

  async function removeCartItem(id: string) {
    setCartStatus('Removing cart item...');
    const response = await fetch(`/api/internal/catalog/storefront-cart?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await response.json();
    setCartStatus(json.ok ? 'Cart item removed.' : (json.error || 'Cart remove failed.'));
    if (json.ok) await loadCart();
  }

  async function uploadArtwork(item: any, fileList: FileList | null) {
    const files = Array.from(fileList || []);
    const notes = artworkNotes[String(item.id || '')] || '';
    if (files.length === 0 && !notes.trim()) return;
    setArtworkStatus('Saving artwork upload metadata...');
    const response = await fetch('/api/internal/catalog/storefront-artwork', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cartItemId: String(item.id || ''),
        notes,
        files: files.map((file) => ({ fileName: file.name, fileSize: file.size, mimeType: file.type || 'application/octet-stream', lastModified: file.lastModified })),
      }),
    });
    const json = await response.json();
    setArtworkStatus(json.ok ? `Artwork saved for ${json.item?.productName || 'cart item'}.` : (json.error || 'Artwork save failed.'));
    if (json.ok) await loadCart();
  }

  function validateCheckout() {
    const errors: string[] = [];
    if (cartItems.length === 0) errors.push('Cart is empty. Add a priced item first.');
    if (!customer.name.trim()) errors.push('Customer name is required.');
    if (!customer.email.trim()) errors.push('Email is required.');
    if (!customer.phone.trim()) errors.push('Phone is required.');
    if (customer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) errors.push('Enter a valid email address.');
    const missingPricing = cartItems.some((item) => !item.pricing && !Number(item.grossTotalMinor || 0));
    if (missingPricing) errors.push('Every cart item must have pricing before checkout.');
    const missingArtwork = cartItems.some((item) => itemArtwork(item).length === 0);
    if (missingArtwork) errors.push('Upload artwork for every cart item before confirming.');
    return errors;
  }

  async function confirmCheckoutDraftOrder() {
    const errors = validateCheckout();
    if (errors.length > 0) {
      setCheckoutStatus(errors.join(' '));
      return;
    }

    setCheckoutSubmitting(true);
    setCheckoutStatus('Confirming draft order...');
    const response = await fetch('/api/internal/catalog/checkout-draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customer }),
    });
    const json = await response.json();
    setCheckoutSubmitting(false);
    setCheckoutStatus(json.ok ? `Draft order confirmed: ${json.item?.title || json.item?.id || 'saved'}` : (json.error || 'Checkout draft order failed.'));
    if (json.ok) {
      setConfirmedDraft(json.item || null);
      setDraftStatus(`Checkout draft saved: ${json.item?.quoteReference || json.item?.id || 'saved'}`);
    }
  }

  async function createOrderPipelineRecord() {
    const draftId = String(confirmedDraft?.id || '');
    if (!draftId) {
      setOrderPipelineStatus('Confirm a checkout draft order first.');
      return;
    }

    setOrderPipelineStatus('Creating order pipeline record...');
    const response = await fetch('/api/internal/catalog/order-pipeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ draftOrderId: draftId }),
    });
    const json = await response.json();
    setOrderPipelineStatus(json.ok ? `Order pipeline created: ${json.item?.orderNumber || json.item?.id || 'saved'}` : (json.error || 'Order pipeline creation failed.'));
    if (json.ok) {
      await loadPipelineOrders();
      await loadProductionJobs();
    }
  }

  async function createProductionJob(order: any) {
    const orderId = String(order?.id || '');
    if (!orderId) {
      setProductionStatus('Select a pipeline order first.');
      return;
    }

    setProductionStatus('Creating production job...');
    const response = await fetch('/api/internal/catalog/production-flow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const json = await response.json();
    setProductionStatus(json.ok ? `Production job created: ${json.item?.jobNumber || json.item?.id || 'saved'}` : (json.error || 'Production job creation failed.'));
    if (json.ok) {
      await loadPipelineOrders();
      await loadProductionJobs();
    }
  }

  async function saveCartAsDraftOrder() {
    if (cartItems.length === 0) {
      setDraftStatus('Cart is empty. Add a priced item first.');
      return;
    }
    const grossTotalMinor = cartItems.reduce((sum, item) => sum + Number(item.grossTotalMinor || 0), 0);
    const currency = String(cartItems[0]?.currency || 'GBP');
    const payload = {
      quoteReference: `CART-${Date.now()}`,
      productName: `${cartItems.length} cart item${cartItems.length === 1 ? '' : 's'}`,
      quantity: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      currency,
      grossTotalMinor,
      items: cartItems,
      source: 'StorefrontTestCartDraftOrder',
      createdAt: new Date().toISOString(),
    };
    setDraftStatus('Saving cart as draft order...');
    const response = await fetch('/api/internal/catalog/draft-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setDraftStatus(json.ok ? `Draft order saved from cart: ${json.item?.title || json.item?.id || 'saved'}` : (json.error || 'Cart draft order failed.'));
  }

  async function saveDraftOrder() {
    const payload = baseOrderPayload('StorefrontTestDraftOrder');
    if (!payload) return;
    setDraftStatus('Saving draft order...');
    const response = await fetch('/api/internal/catalog/draft-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        quoteReference: payload.quoteReference,
        productId: product?.id,
        productSlug: product?.slug,
        productName: product?.name,
        quantity,
        selections,
        currency: payload.currency,
        grossTotalMinor: payload.grossTotalMinor,
        payload,
      }),
    });
    const json = await response.json();
    setDraftStatus(json.ok ? `Draft order saved: ${json.item?.title || json.item?.id || 'saved'}` : (json.error || 'Draft order failed.'));
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <div className="rounded-3xl border border-border bg-panel p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Live site rehearsal</p>
        <h1 className="mt-2 text-3xl font-semibold">Storefront Test</h1>
        <p className="mt-2 text-sm text-textMuted">Customer-style flow: product → option selection → validation → live price → cart/draft order.</p>
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

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <p className="font-medium">Readiness</p>
            {validation.errors.length === 0 ? <p className="mt-1 text-emerald-200">Ready to price.</p> : <ul className="mt-2 list-disc space-y-1 pl-5 text-red-200">{validation.errors.map((item) => <li key={item}>{item}</li>)}</ul>}
            {validation.warnings.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100">{validation.warnings.map((item) => <li key={item}>{item}</li>)}</ul>}
          </div>

          <button className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-50" onClick={calculatePrice} disabled={!canPrice || productLoading}>
            {productLoading ? 'Loading product...' : 'Calculate customer price'}
          </button>

          {pricing && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100" onClick={saveCartItem}>Add to test cart</button>
              <button className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100" onClick={saveDraftOrder}>Save as draft order</button>
            </div>
          )}

          {cartStatus && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{cartStatus}</p>}
          {draftStatus && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{draftStatus}</p>}
        </section>

        <section className="rounded-3xl border border-border bg-panel p-5">
          <h2 className="text-xl font-semibold">{product?.name || 'Select a product'}</h2>
          <p className="mt-2 text-sm text-textMuted">{product?.description || 'Configured storefront options appear below.'}</p>

          <div className="mt-5 space-y-4">
            {groups.length === 0 && <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">This product has no option groups yet. Configure options in Product Builder first.</p>}
            {groups.map((group) => {
              const key = groupKey(group);
              const values = sortedValues(group);
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
                      <option value="">Select {group.name || group.label || key}</option>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Test cart</p>
            <h2 className="mt-1 text-xl font-semibold">Cart Review</h2>
            <p className="mt-1 text-sm text-textMuted">Review, update or remove priced items before saving the cart as a draft order.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border border-border px-3 py-2 text-sm text-textMuted" onClick={loadCart}>Refresh cart</button>
            <button className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-100 disabled:opacity-50" onClick={saveCartAsDraftOrder} disabled={cartItems.length === 0}>Save cart as draft order</button>
            <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100 disabled:opacity-50" onClick={() => setShowCheckout(true)} disabled={cartItems.length === 0}>Proceed to Checkout</button>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-textMuted">No cart items yet. Calculate a product price, then add it to the test cart.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div key={String(item.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{String(item.productName || item.productSlug || item.productId || item.title || 'Cart item')}</p>
                    <p className="mt-1 text-xs text-textMuted">{String(item.id || '')}</p>
                    <p className="mt-2 text-sm text-textMuted">Total: <span className="text-white">{money(Number(item.grossTotalMinor || 0), String(item.currency || 'GBP'))}</span></p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-textMuted">
                      Qty
                      <input className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-white" type="number" min={1} defaultValue={Number(item.quantity || 1)} onBlur={(event) => updateCartQuantity(item, Number(event.target.value || 1))} />
                    </label>
                    <button className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-100" onClick={() => removeCartItem(String(item.id))}>Remove</button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-indigo-100">Artwork upload</p>
                      <p className="mt-1 text-xs text-textMuted">Attach customer artwork metadata to this cart item before draft order confirmation.</p>
                    </div>
                    <span className="rounded-full border border-indigo-400/30 px-2 py-1 text-xs text-indigo-100">{itemArtwork(item).length} file{itemArtwork(item).length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                    <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-textMuted" type="file" multiple onChange={(event) => uploadArtwork(item, event.target.files)} />
                    <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Artwork notes" value={artworkNotes[String(item.id || '')] || ''} onChange={(event) => setArtworkNotes((prev) => ({ ...prev, [String(item.id || '')]: event.target.value }))} />
                  </div>
                  {itemArtwork(item).length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-textMuted">
                      {itemArtwork(item).map((upload) => (
                        <li key={upload.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-black/20 px-2 py-1">
                          <span>{upload.fileName}</span>
                          <span>{Math.ceil(Number(upload.fileSize || 0) / 1024)} KB · {upload.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {item.selections && <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify(item.selections, null, 2)}</pre>}
              </div>
            ))}
          </div>
        )}
        {artworkStatus && <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{artworkStatus}</p>}
      </section>

      {showCheckout && (
        <section className="rounded-3xl border border-emerald-500/25 bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/75">Checkout</p>
              <h2 className="mt-1 text-xl font-semibold">Customer Details</h2>
              <p className="mt-1 text-sm text-textMuted">No payments yet. This confirms the cart into a structured draft order.</p>
            </div>
            <button className="rounded-xl border border-border px-3 py-2 text-sm text-textMuted" onClick={() => setShowCheckout(false)}>Hide checkout</button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Customer name <span className="text-red-300">*</span></span>
              <input className="rounded-xl border border-border bg-background px-3 py-2" value={customer.name} onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Email <span className="text-red-300">*</span></span>
              <input className="rounded-xl border border-border bg-background px-3 py-2" type="email" value={customer.email} onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Phone <span className="text-red-300">*</span></span>
              <input className="rounded-xl border border-border bg-background px-3 py-2" value={customer.phone} onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Company <span className="text-textMuted">optional</span></span>
              <input className="rounded-xl border border-border bg-background px-3 py-2" value={customer.company} onChange={(event) => setCustomer((prev) => ({ ...prev, company: event.target.value }))} />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-medium">Draft order confirmation</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div><p className="text-xs text-textMuted">Items</p><p className="text-xl font-semibold">{cartItems.length}</p></div>
              <div><p className="text-xs text-textMuted">Net</p><p className="text-xl font-semibold">{money(cartNetTotal(cartItems), String(cartItems[0]?.currency || 'GBP'))}</p></div>
              <div><p className="text-xs text-textMuted">VAT</p><p className="text-xl font-semibold">{money(cartVatTotal(cartItems), String(cartItems[0]?.currency || 'GBP'))}</p></div>
              <div><p className="text-xs text-textMuted">Total</p><p className="text-xl font-semibold">{money(cartTotal(cartItems), String(cartItems[0]?.currency || 'GBP'))}</p></div>
            </div>
            <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-sm text-indigo-100">Artwork files attached: {cartArtworkCount(cartItems)}. Draft order confirmation requires artwork on every cart item.</div>
            <p className="mt-3 text-sm text-textMuted">Includes selected options, pricing breakdown, VAT, totals, turnaround, delivery estimate and artwork upload metadata where available on the priced cart item.</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-50" onClick={confirmCheckoutDraftOrder} disabled={checkoutSubmitting || cartItems.length === 0}>
              {checkoutSubmitting ? 'Confirming...' : 'Confirm Draft Order'}
            </button>
            <button className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 disabled:opacity-50" onClick={createOrderPipelineRecord} disabled={!confirmedDraft}>
              Create Order Pipeline
            </button>
            {checkoutStatus && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{checkoutStatus}</p>}
            {orderPipelineStatus && <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{orderPipelineStatus}</p>}
          </div>

          {confirmedDraft && (
            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
              <p className="font-medium">Ready for order pipeline</p>
              <p className="mt-1 text-textMuted">Draft: {String(confirmedDraft.quoteReference || confirmedDraft.id)} · Status: {String(confirmedDraft.status || 'draft-order')}</p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-border bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Order pipeline</p>
            <h2 className="mt-1 text-xl font-semibold">Recent Pipeline Orders</h2>
            <p className="mt-1 text-sm text-textMuted">Confirmed checkout drafts move here as order-received records. Payment is still not enabled.</p>
          </div>
          <button className="rounded-xl border border-border px-3 py-2 text-sm text-textMuted" onClick={loadPipelineOrders}>Refresh pipeline</button>
        </div>
        {pipelineOrders.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-textMuted">No pipeline orders yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pipelineOrders.slice(0, 5).map((order) => (
              <div key={String(order.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{String(order.orderNumber || order.id)}</p>
                    <p className="mt-1 text-xs text-textMuted">Draft: {String(order.draftOrderId || '')}</p>
                    <p className="mt-2 text-sm text-textMuted">Customer: <span className="text-white">{String(order.customer?.name || 'Customer')}</span></p>
                  </div>
                  <div className="text-right text-sm text-textMuted">
                    <p className="text-white">{money(Number(order.totals?.grossTotalMinor || 0), String(order.totals?.currency || 'GBP'))}</p>
                    <p>{String(order.status || 'order-received')}</p>
                    <p>{String(order.productionStatus || 'awaiting-artwork-review')}</p>
                    <button className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 disabled:opacity-50" onClick={() => createProductionJob(order)} disabled={Boolean(order.productionJobId)}>
                      {order.productionJobId ? 'Production job created' : 'Create Production Job'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Production flow</p>
            <h2 className="mt-1 text-xl font-semibold">Recent Production Jobs</h2>
            <p className="mt-1 text-sm text-textMuted">Pipeline orders with artwork and pricing can move into the prepress production queue. Payments are still not enabled.</p>
          </div>
          <button className="rounded-xl border border-border px-3 py-2 text-sm text-textMuted" onClick={loadProductionJobs}>Refresh production</button>
        </div>
        {productionStatus && <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{productionStatus}</p>}
        {productionJobs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-textMuted">No production jobs yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {productionJobs.slice(0, 5).map((job) => (
              <div key={String(job.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{String(job.jobNumber || job.id)}</p>
                    <p className="mt-1 text-xs text-textMuted">Order: {String(job.orderNumber || job.orderId || '')}</p>
                    <p className="mt-2 text-sm text-textMuted">Customer: <span className="text-white">{String(job.customer?.name || 'Customer')}</span></p>
                  </div>
                  <div className="text-right text-sm text-textMuted">
                    <p className="text-white">{money(Number(job.totals?.grossTotalMinor || 0), String(job.totals?.currency || 'GBP'))}</p>
                    <p>{String(job.status || 'production-ready')}</p>
                    <p>{String(job.productionStage || 'prepress-queue')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <section className="rounded-3xl border border-border bg-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Debug payload</p>
          <button className="rounded-lg border border-border px-3 py-1 text-xs text-textMuted" onClick={() => navigator.clipboard?.writeText(JSON.stringify({ productId, quantity, selections, validation, pricing, cartItems, customer, artworkNotes, confirmedDraft, pipelineOrders, productionJobs }, null, 2))}>Copy JSON</button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify({ productId, quantity, selections, validation, pricing, cartItems, customer, artworkNotes, confirmedDraft, pipelineOrders, productionJobs }, null, 2)}</pre>
      </section>
    </main>
  );
}
