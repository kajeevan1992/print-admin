'use client';

import { useState } from 'react';

type PrintMathsForm = {
  quantity: number; productWidthMm: number; productHeightMm: number; sheetWidthMm: number; sheetHeightMm: number; sides: number; wastePercent: number; makeReadySheets: number;
  sheetCostMinor: number; clickCostMinor: number; setupCostMinor: number; finishingCostMinor: number;
  laminationCostMinor: number; laminationMode: string; foldingCostMinor: number; foldingMode: string; cuttingCostMinor: number; cuttingMode: string; cutCount: number;
  spotUvCostMinor: number; spotUvMode: string; packingCostMinor: number; packingMode: string;
  markupPercent: number; marginPercent: number; minimumSellPriceMinor: number; roundingMinor: number;
  turnaroundMode: string; turnaroundMultiplierPercent: number; turnaroundFlatFeeMinor: number; productionDays: number; deliveryDays: number; includeWeekends: string;
  discountMode: string; discountPercent: number; discountFixedMinor: number; vatRatePercent: number; vatInclusive: string;
};

const initialForm: PrintMathsForm = {
  quantity: 100, productWidthMm: 85, productHeightMm: 55, sheetWidthMm: 450, sheetHeightMm: 320, sides: 2, wastePercent: 5, makeReadySheets: 2,
  sheetCostMinor: 45, clickCostMinor: 4, setupCostMinor: 500, finishingCostMinor: 0,
  laminationCostMinor: 0, laminationMode: 'none', foldingCostMinor: 0, foldingMode: 'none', cuttingCostMinor: 0, cuttingMode: 'none', cutCount: 1,
  spotUvCostMinor: 0, spotUvMode: 'none', packingCostMinor: 0, packingMode: 'none',
  markupPercent: 0, marginPercent: 35, minimumSellPriceMinor: 1500, roundingMinor: 5,
  turnaroundMode: 'standard', turnaroundMultiplierPercent: 0, turnaroundFlatFeeMinor: 0, productionDays: 3, deliveryDays: 1, includeWeekends: 'false',
  discountMode: 'none', discountPercent: 0, discountFixedMinor: 0, vatRatePercent: 20, vatInclusive: 'false',
};

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

export default function PrintMathsLab() {
  const [form, setForm] = useState<PrintMathsForm>(initialForm);
  const [quantityTiers, setQuantityTiers] = useState(defaultTiers);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key: keyof PrintMathsForm, value: number | string) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function run() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(Object.entries(form).map(([key, value]) => [key, String(value)]));
      if (quantityTiers.trim()) params.set('quantityTiers', quantityTiers);
      const response = await fetch(`/api/internal/catalog/print-maths?${params.toString()}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Print maths calculation failed');
      setResult(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Print maths calculation failed'); setResult(null); }
    finally { setLoading(false); }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Print Maths Lab</h1>
      <p style={{ color: '#555', marginTop: 6 }}>Test sheet fit, costs, finishing, turnaround, delivery estimate, discounts, VAT, margin and sell price.</p>

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

      <button onClick={run} disabled={loading} style={{ marginTop: 16, padding: '10px 16px', border: '1px solid #111', borderRadius: 8, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Calculating…' : 'Calculate'}</button>
      {error ? <div style={{ marginTop: 16, padding: 12, border: '1px solid #c00', borderRadius: 8, color: '#c00' }}>{error}</div> : null}

      {result ? <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            ['Ups per sheet', result.upsPerSheet], ['Total sheets', result.totalSheets], ['Impressions', result.impressions], ['Total cost', formatMoney(result.totalCostMinor, result.currency)], ['Sell price', formatMoney(result.sellPriceMinor, result.currency)], ['Discount', formatMoney(result.discountMinor, result.currency)], ['Net ex VAT', formatMoney(result.netSellPriceMinor, result.currency)], ['VAT', formatMoney(result.vatMinor, result.currency)], ['Gross total', formatMoney(result.grossSellPriceMinor, result.currency)], ['Profit', formatMoney(result.profitMinor, result.currency)], ['Margin', `${result.achievedMarginPercent || 0}%`], ['Turnaround', `${result.turnaroundMode} (+${result.turnaroundMultiplierPercent || 0}%)`], ['Ready date', result.deliveryEstimate?.estimatedReadyDate || '-'], ['Delivery date', result.deliveryEstimate?.estimatedDeliveryDate || '-'],
          ].map(([label, value]) => <div key={label} style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}><strong>{label}</strong><div>{value as any}</div></div>)}
        </div>
        {Array.isArray(result.costLines) && result.costLines.length ? <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Cost line</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Qty</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Unit</th><th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Total</th></tr></thead><tbody>{result.costLines.map((line: any) => <tr key={line.code}><td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{line.label}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{line.quantity}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(line.unitCostMinor, result.currency)}</td><td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(line.totalMinor, result.currency)}</td></tr>)}</tbody></table> : null}
        <details><summary>Raw result</summary><pre style={{ marginTop: 8, padding: 16, background: '#f6f6f6', borderRadius: 8, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre></details>
      </section> : null}
    </main>
  );
}
