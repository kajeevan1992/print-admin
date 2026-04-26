'use client';

import { useEffect, useMemo, useState } from 'react';

type PrintMathsForm = {
  quantity: number; productWidthMm: number; productHeightMm: number; sheetWidthMm: number; sheetHeightMm: number; sides: number; wastePercent: number; makeReadySheets: number;
  sheetCostMinor: number; clickCostMinor: number; setupCostMinor: number; finishingCostMinor: number;
  laminationCostMinor: number; laminationMode: string; foldingCostMinor: number; foldingMode: string; cuttingCostMinor: number; cuttingMode: string; cutCount: number;
  spotUvCostMinor: number; spotUvMode: string; packingCostMinor: number; packingMode: string;
  markupPercent: number; marginPercent: number; minimumSellPriceMinor: number; roundingMinor: number;
  turnaroundMode: string; turnaroundMultiplierPercent: number; turnaroundFlatFeeMinor: number; productionDays: number; deliveryDays: number; includeWeekends: string;
  discountMode: string; discountPercent: number; discountFixedMinor: number; vatRatePercent: number; vatInclusive: string;
};

type QuoteMeta = { productName: string; customerName: string; quoteReference: string; validDays: number };
type Snapshot = { id: string; title: string; name?: string; form: PrintMathsForm; quoteMeta: QuoteMeta; quantityTiers: string; result?: any; createdAt?: string; updatedAt?: string };
type DraftOrder = { id: string; title: string; status?: string; quoteReference?: string; productName?: string; customerName?: string; grossTotalMinor?: number; currency?: string; payload?: any; createdAt?: string; updatedAt?: string };

const SNAPSHOT_KEY = 'pricing-quote-snapshots';

const initialForm: PrintMathsForm = {
  quantity: 100, productWidthMm: 85, productHeightMm: 55, sheetWidthMm: 450, sheetHeightMm: 320, sides: 2, wastePercent: 5, makeReadySheets: 2,
  sheetCostMinor: 45, clickCostMinor: 4, setupCostMinor: 500, finishingCostMinor: 0,
  laminationCostMinor: 0, laminationMode: 'none', foldingCostMinor: 0, foldingMode: 'none', cuttingCostMinor: 0, cuttingMode: 'none', cutCount: 1,
  spotUvCostMinor: 0, spotUvMode: 'none', packingCostMinor: 0, packingMode: 'none',
  markupPercent: 0, marginPercent: 35, minimumSellPriceMinor: 1500, roundingMinor: 5,
  turnaroundMode: 'standard', turnaroundMultiplierPercent: 0, turnaroundFlatFeeMinor: 0, productionDays: 3, deliveryDays: 1, includeWeekends: 'false',
  discountMode: 'none', discountPercent: 0, discountFixedMinor: 0, vatRatePercent: 20, vatInclusive: 'false',
};

const initialQuoteMeta: QuoteMeta = { productName: 'Business Cards', customerName: '', quoteReference: '', validDays: 14 };

const numericFields: Array<keyof PrintMathsForm> = [
  'quantity', 'productWidthMm', 'productHeightMm', 'sheetWidthMm', 'sheetHeightMm', 'sides', 'wastePercent', 'makeReadySheets',
  'sheetCostMinor', 'clickCostMinor', 'setupCostMinor', 'finishingCostMinor', 'laminationCostMinor', 'foldingCostMinor', 'cuttingCostMinor', 'cutCount',
  'spotUvCostMinor', 'packingCostMinor', 'markupPercent', 'marginPercent', 'minimumSellPriceMinor', 'roundingMinor',
  'turnaroundMultiplierPercent', 'turnaroundFlatFeeMinor', 'productionDays', 'deliveryDays',
  'discountPercent', 'discountFixedMinor', 'vatRatePercent',
];

const modeFields: Array<{ key: keyof PrintMathsForm; options: string[] }> = [
  { key: 'laminationMode', options: ['none', 'per_unit', 'per_sheet', 'per_side_impression'] },
  { key: 'foldingMode', options: ['none', 'per_unit', 'per_sheet'] },
  { key: 'cuttingMode', options: ['none', 'per_unit', 'per_sheet', 'per_cut'] },
  { key: 'spotUvMode', options: ['none', 'per_unit', 'per_sheet', 'per_side_impression'] },
  { key: 'packingMode', options: ['none', 'per_unit', 'flat'] },
  { key: 'turnaroundMode', options: ['standard', 'priority', 'rush', 'custom'] },
  { key: 'includeWeekends', options: ['false', 'true'] },
  { key: 'discountMode', options: ['none', 'percent', 'fixed'] },
  { key: 'vatInclusive', options: ['false', 'true'] },
];

const defaultTiers = JSON.stringify([
  { minQuantity: 1, marginPercent: 40 },
  { minQuantity: 250, marginPercent: 35 },
  { minQuantity: 1000, marginPercent: 30 },
], null, 2);

function formatMoney(minor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((minor || 0) / 100);
}

function humanLabel(key: string) {
  return key.replace(/Minor$/, ' (pence)').replace(/Mm$/, ' mm').replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function safeSnapshotTitle(meta: QuoteMeta, form: PrintMathsForm) {
  const bits = [meta.productName || 'Print quote', form.quantity ? `${form.quantity} qty` : '', meta.customerName || ''].filter(Boolean);
  return bits.join(' - ');
}

export default function PrintMathsLab() {
  const [form, setForm] = useState<PrintMathsForm>(initialForm);
  const [quoteMeta, setQuoteMeta] = useState<QuoteMeta>(initialQuoteMeta);
  const [quantityTiers, setQuantityTiers] = useState(defaultTiers);
  const [result, setResult] = useState<any>(null);
  const [orderPayload, setOrderPayload] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const comparisonRows = useMemo(() => snapshots.filter((item) => item.result), [snapshots]);

  useEffect(() => {
    loadSnapshots();
    loadDraftOrders();
  }, []);

  function update(key: keyof PrintMathsForm, value: number | string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateQuote(key: keyof QuoteMeta, value: string | number) {
    setQuoteMeta((prev) => ({ ...prev, [key]: value }));
  }

  function buildParams() {
    const params = new URLSearchParams(Object.entries(form).map(([key, value]) => [key, String(value)]));
    Object.entries(quoteMeta).forEach(([key, value]) => params.set(key, String(value)));
    if (quantityTiers.trim()) params.set('quantityTiers', quantityTiers);
    return params;
  }

  async function run(nextForm = form, nextQuoteMeta = quoteMeta, nextTiers = quantityTiers) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(Object.entries(nextForm).map(([key, value]) => [key, String(value)]));
      Object.entries(nextQuoteMeta).forEach(([key, value]) => params.set(key, String(value)));
      if (nextTiers.trim()) params.set('quantityTiers', nextTiers);
      const response = await fetch(`/api/internal/catalog/print-maths?${params.toString()}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Print maths calculation failed');
      setResult(json.data);
      setOrderPayload(null);
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print maths calculation failed');
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshots() {
    setSnapshotLoading(true);
    setSnapshotStatus('');
    try {
      const response = await fetch(`/api/internal/config/${SNAPSHOT_KEY}/items`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not load quote snapshots');
      setSnapshots(Array.isArray(json.data?.items) ? json.data.items : []);
      setSnapshotStatus('Quote snapshots loaded from DB/API.');
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : 'Quote snapshot API unavailable.');
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function saveSnapshot() {
    setSnapshotLoading(true);
    setSnapshotStatus('');
    try {
      const currentResult = result || await run();
      if (!currentResult) throw new Error('Run pricing first before saving a quote snapshot.');
      const now = new Date().toISOString();
      const id = `quote-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
      const title = safeSnapshotTitle(quoteMeta, form);
      const payload: Snapshot = { id, title, name: title, form, quoteMeta, quantityTiers, result: currentResult, createdAt: now, updatedAt: now };
      const response = await fetch(`/api/internal/config/${SNAPSHOT_KEY}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not save quote snapshot');
      await loadSnapshots();
      setSnapshotStatus('Quote snapshot saved.');
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : 'Could not save quote snapshot.');
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function deleteSnapshot(id: string) {
    setSnapshotLoading(true);
    setSnapshotStatus('');
    try {
      const response = await fetch(`/api/internal/config/${SNAPSHOT_KEY}/items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not delete quote snapshot');
      await loadSnapshots();
      setSnapshotStatus('Quote snapshot deleted.');
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : 'Could not delete quote snapshot.');
    } finally {
      setSnapshotLoading(false);
    }
  }

  function loadSnapshot(snapshot: Snapshot) {
    if (snapshot.form) setForm({ ...initialForm, ...snapshot.form });
    if (snapshot.quoteMeta) setQuoteMeta({ ...initialQuoteMeta, ...snapshot.quoteMeta });
    setQuantityTiers(snapshot.quantityTiers || defaultTiers);
    setResult(snapshot.result || null);
    setSnapshotStatus(`Loaded ${snapshot.title}.`);
  }

  function copyQuoteJson() {
    const payload = JSON.stringify({ form, quoteMeta, quantityTiers, result }, null, 2);
    navigator.clipboard?.writeText(payload).then(() => setSnapshotStatus('Quote JSON copied.')).catch(() => setSnapshotStatus('Could not copy quote JSON.'));
  }


  async function generateOrderPayload() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/internal/catalog/quote-order-payload?${buildParams().toString()}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not generate quote-to-order payload');
      setOrderPayload(json.data);
      setSnapshotStatus(json.data?.validation?.ok ? 'Quote-to-order payload is ready.' : 'Quote-to-order payload generated with warnings/errors.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate quote-to-order payload');
      setOrderPayload(null);
    } finally {
      setLoading(false);
    }
  }

  function copyOrderPayload() {
    if (!orderPayload) return;
    navigator.clipboard?.writeText(JSON.stringify(orderPayload, null, 2)).then(() => setSnapshotStatus('Quote-to-order payload copied.')).catch(() => setSnapshotStatus('Could not copy quote-to-order payload.'));
  }

  async function loadDraftOrders() {
    try {
      const response = await fetch('/api/internal/catalog/draft-orders', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not load draft orders');
      setDraftOrders(Array.isArray(json.data?.items) ? json.data.items : []);
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : 'Draft order API unavailable.');
    }
  }

  async function saveDraftOrder() {
    setLoading(true);
    setError('');
    try {
      let payload = orderPayload;
      if (!payload) {
        const response = await fetch(`/api/internal/catalog/quote-order-payload?${buildParams().toString()}`, { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json.ok) throw new Error(json.error || 'Could not generate quote-to-order payload');
        payload = json.data;
        setOrderPayload(payload);
      }
      if (payload?.validation?.errors?.length) throw new Error(`Cannot save draft order: ${payload.validation.errors.join(' | ')}`);
      const response = await fetch('/api/internal/catalog/draft-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not save draft order');
      await loadDraftOrders();
      setSnapshotStatus(`Draft order saved: ${json.item?.title || json.item?.id || 'saved'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft order');
    } finally {
      setLoading(false);
    }
  }

  async function deleteDraftOrder(id: string) {
    try {
      const response = await fetch(`/api/internal/catalog/draft-orders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Could not delete draft order');
      await loadDraftOrders();
      setSnapshotStatus('Draft order deleted.');
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : 'Could not delete draft order.');
    }
  }

  function loadDraftOrder(draft: DraftOrder) {
    setOrderPayload(draft.payload || draft);
    setSnapshotStatus(`Loaded draft order ${draft.title || draft.id}.`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1280 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Print Maths Lab</h1>
      <p style={{ color: '#555', marginTop: 6 }}>Test sheet fit, costs, finishing, turnaround, delivery estimate, discounts, VAT, margin, sell price and saved quote snapshots.</p>

      <section style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Quote snapshot library</h2>
        <p style={{ color: '#666', marginTop: 4 }}>Save calculated quotes to the database, reload them later, and compare historical price outcomes.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button onClick={saveSnapshot} disabled={snapshotLoading} style={{ padding: '9px 14px', border: '1px solid #111', borderRadius: 8 }}>Save current quote</button>
          <button onClick={loadSnapshots} disabled={snapshotLoading} style={{ padding: '9px 14px', border: '1px solid #999', borderRadius: 8 }}>Reload snapshots</button>
          <button onClick={copyQuoteJson} style={{ padding: '9px 14px', border: '1px solid #999', borderRadius: 8 }}>Copy quote JSON</button>
        </div>
        {snapshotStatus ? <div style={{ marginTop: 10, padding: 10, background: '#f7f7f7', borderRadius: 8 }}>{snapshotStatus}</div> : null}
        {snapshots.length ? <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {snapshots.map((snapshot) => <div key={snapshot.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, border: '1px solid #eee', borderRadius: 8, alignItems: 'center' }}>
            <div><strong>{snapshot.title}</strong><div style={{ color: '#666', fontSize: 13 }}>{snapshot.updatedAt || snapshot.createdAt || snapshot.id}</div></div>
            <div style={{ display: 'flex', gap: 8 }}><button onClick={() => loadSnapshot(snapshot)} style={{ padding: '7px 10px', border: '1px solid #999', borderRadius: 8 }}>Load</button><button onClick={() => deleteSnapshot(snapshot.id)} style={{ padding: '7px 10px', border: '1px solid #c00', borderRadius: 8, color: '#c00' }}>Delete</button></div>
          </div>)}
        </div> : <p style={{ color: '#777', marginTop: 10 }}>No saved quote snapshots yet.</p>}
      </section>

      <section style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Draft orders from quotes</h2>
        <p style={{ color: '#666', marginTop: 4 }}>This is still a draft workflow. It saves quote-to-order payloads to DB/API so the future cart/order system can pick them up safely.</p>
        <div style={{ marginTop: 12 }}>
          <button onClick={loadDraftOrders} style={{ padding: '9px 14px', border: '1px solid #999', borderRadius: 8 }}>Reload draft orders</button>
        </div>
        {draftOrders.length ? <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {draftOrders.map((draft) => <div key={draft.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, border: '1px solid #eee', borderRadius: 8, alignItems: 'center' }}>
            <div>
              <strong>{draft.title || draft.id}</strong>
              <div style={{ color: '#666', fontSize: 13 }}>{draft.status || 'draft'} · {formatMoney(draft.grossTotalMinor || draft.payload?.pricing?.grossTotalMinor || 0, draft.currency || draft.payload?.currency || 'GBP')} · {draft.updatedAt || draft.createdAt || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => loadDraftOrder(draft)} style={{ padding: '7px 10px', border: '1px solid #999', borderRadius: 8 }}>Load</button>
              <button onClick={() => deleteDraftOrder(draft.id)} style={{ padding: '7px 10px', border: '1px solid #c00', borderRadius: 8, color: '#c00' }}>Delete</button>
            </div>
          </div>)}
        </div> : <p style={{ color: '#777', marginTop: 10 }}>No draft orders saved yet.</p>}
      </section>

      {comparisonRows.length ? <section style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Saved quote comparison</h2>
        <div style={{ overflowX: 'auto', marginTop: 10 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Quote', 'Qty', 'Cost', 'Sell', 'Gross', 'Profit', 'Margin', 'Ready'].map((head) => <th key={head} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>{head}</th>)}</tr></thead><tbody>{comparisonRows.map((snapshot) => <tr key={snapshot.id}><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{snapshot.title}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{snapshot.result?.quoteSummary?.quantity || snapshot.form?.quantity}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{formatMoney(snapshot.result?.totalCostMinor, snapshot.result?.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{formatMoney(snapshot.result?.sellPriceMinor, snapshot.result?.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{formatMoney(snapshot.result?.grossSellPriceMinor, snapshot.result?.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{formatMoney(snapshot.result?.profitMinor, snapshot.result?.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{snapshot.result?.achievedMarginPercent || 0}%</td><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{snapshot.result?.deliveryEstimate?.estimatedReadyDate || '-'}</td></tr>)}</tbody></table></div>
      </section> : null}

      <section style={{ marginTop: 20 }}><h2 style={{ fontSize: 20, fontWeight: 700 }}>Quote details</h2>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>Product name</span><input value={quoteMeta.productName} onChange={(e) => updateQuote('productName', e.target.value)} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>Customer name</span><input value={quoteMeta.customerName} onChange={(e) => updateQuote('customerName', e.target.value)} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>Quote reference</span><input value={quoteMeta.quoteReference} onChange={(e) => updateQuote('quoteReference', e.target.value)} placeholder="Auto if blank" style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>Valid days</span><input type="number" value={quoteMeta.validDays} onChange={(e) => updateQuote('validDays', Number(e.target.value))} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }} /></label>
        </div>
      </section>

      <section style={{ marginTop: 20 }}><h2 style={{ fontSize: 20, fontWeight: 700 }}>Inputs</h2>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {numericFields.map((key) => <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>{humanLabel(key)}</span><input type="number" value={form[key] as number} onChange={(e) => update(key, Number(e.target.value))} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }} /></label>)}
        </div>
      </section>

      <section style={{ marginTop: 20 }}><h2 style={{ fontSize: 20, fontWeight: 700 }}>Modes & turnaround</h2>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {modeFields.map(({ key, options }) => <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600 }}><span>{humanLabel(key)}</span><select value={form[key] as string} onChange={(e) => update(key, e.target.value)} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
        </div>
      </section>

      <section style={{ marginTop: 20 }}><h2 style={{ fontSize: 20, fontWeight: 700 }}>Quantity tiers</h2><p style={{ color: '#666' }}>JSON array. Highest matching minQuantity is applied.</p><textarea value={quantityTiers} onChange={(e) => setQuantityTiers(e.target.value)} rows={8} style={{ marginTop: 8, width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, fontFamily: 'monospace' }} /></section>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <button onClick={() => run()} disabled={loading} style={{ padding: '10px 16px', border: '1px solid #111', borderRadius: 8, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Calculating…' : 'Calculate'}</button>
        <button onClick={generateOrderPayload} disabled={loading} style={{ padding: '10px 16px', border: '1px solid #999', borderRadius: 8, cursor: loading ? 'wait' : 'pointer' }}>Generate quote-to-order payload</button>
        {orderPayload ? <button onClick={copyOrderPayload} style={{ padding: '10px 16px', border: '1px solid #999', borderRadius: 8 }}>Copy order payload</button> : null}
        <button onClick={saveDraftOrder} disabled={loading} style={{ padding: '10px 16px', border: '1px solid #0a7', borderRadius: 8, color: '#075' }}>Save draft order</button>
      </div>
      {error ? <div style={{ marginTop: 16, padding: 12, border: '1px solid #c00', borderRadius: 8, color: '#c00' }}>{error}</div> : null}

      {result ? <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            ['Ups per sheet', result.upsPerSheet], ['Total sheets', result.totalSheets], ['Impressions', result.impressions], ['Total cost', formatMoney(result.totalCostMinor, result.currency)], ['Sell price', formatMoney(result.sellPriceMinor, result.currency)], ['Discount', formatMoney(result.discountMinor, result.currency)], ['Net ex VAT', formatMoney(result.netSellPriceMinor, result.currency)], ['VAT', formatMoney(result.vatMinor, result.currency)], ['Gross total', formatMoney(result.grossSellPriceMinor, result.currency)], ['Profit', formatMoney(result.profitMinor, result.currency)], ['Margin', `${result.achievedMarginPercent || 0}%`], ['Turnaround', `${result.turnaroundMode} (+${result.turnaroundMultiplierPercent || 0}%)`], ['Ready date', result.deliveryEstimate?.estimatedReadyDate || '-'], ['Delivery date', result.deliveryEstimate?.estimatedDeliveryDate || '-'],
          ].map(([label, value]) => <div key={label} style={{ padding: 14, border: '1px solid #ddd', borderRadius: 10 }}><div style={{ color: '#666', fontSize: 13 }}>{label}</div><strong>{value}</strong></div>)}
        </div>

        {result.quoteSummary ? <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10 }}><h2 style={{ fontSize: 20, fontWeight: 700 }}>Customer quote summary</h2><div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div><strong>Reference</strong><br />{result.quoteSummary.quoteReference}</div><div><strong>Product</strong><br />{result.quoteSummary.productName}</div><div><strong>Customer</strong><br />{result.quoteSummary.customerName || '-'}</div><div><strong>Valid until</strong><br />{result.quoteSummary.validUntil}</div><div><strong>Unit price</strong><br />{formatMoney(result.quoteSummary.unitPriceMinor, result.currency)}</div><div><strong>Gross total</strong><br />{formatMoney(result.quoteSummary.grossTotalMinor, result.currency)}</div>
        </div></div> : null}

        {Array.isArray(result.costLines) && result.costLines.length ? <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Cost line</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Qty</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Unit</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Total</th></tr></thead><tbody>{result.costLines.map((line: any) => <tr key={line.code}><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{line.label}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{line.quantity}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(line.unitCostMinor, result.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(line.totalMinor, result.currency)}</td></tr>)}</tbody></table> : null}
        {orderPayload ? <div style={{ padding: 16, border: orderPayload.validation?.ok ? '1px solid #0a7' : '1px solid #c90', borderRadius: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Quote-to-order prep payload</h2>
          <p style={{ color: '#666', marginTop: 4 }}>This does not create an order yet. It prepares the clean payload the cart/order flow can use later.</p>
          {orderPayload.validation?.errors?.length ? <div style={{ marginTop: 10, color: '#c00' }}><strong>Errors:</strong> {orderPayload.validation.errors.join(' | ')}</div> : null}
          {orderPayload.validation?.warnings?.length ? <div style={{ marginTop: 10, color: '#9a6a00' }}><strong>Warnings:</strong> {orderPayload.validation.warnings.join(' | ')}</div> : null}
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div><strong>Status</strong><br />{orderPayload.status}</div><div><strong>Reference</strong><br />{orderPayload.quoteReference}</div><div><strong>Gross total</strong><br />{formatMoney(orderPayload.pricing?.grossTotalMinor, orderPayload.currency)}</div><div><strong>Ready</strong><br />{orderPayload.fulfilment?.estimatedReadyDate}</div>
          </div>
          <details style={{ marginTop: 10 }}><summary>Raw quote-to-order payload</summary><pre style={{ marginTop: 8, padding: 16, background: '#f6f6f6', borderRadius: 8, overflow: 'auto' }}>{JSON.stringify(orderPayload, null, 2)}</pre></details>
        </div> : null}
        <details><summary>Raw result</summary><pre style={{ marginTop: 8, padding: 16, background: '#f6f6f6', borderRadius: 8, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre></details>
      </section> : null}
    </main>
  );
}
