'use client';

import { useState } from 'react';

type PrintMathsForm = {
  quantity: number;
  productWidthMm: number;
  productHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  sides: number;
  wastePercent: number;
  makeReadySheets: number;
  sheetCostMinor: number;
  clickCostMinor: number;
  setupCostMinor: number;
  finishingCostMinor: number;
  laminationCostMinor: number;
  laminationMode: string;
  foldingCostMinor: number;
  foldingMode: string;
  cuttingCostMinor: number;
  cuttingMode: string;
  cutCount: number;
  spotUvCostMinor: number;
  spotUvMode: string;
  packingCostMinor: number;
  packingMode: string;
};

const initialForm: PrintMathsForm = {
  quantity: 100,
  productWidthMm: 85,
  productHeightMm: 55,
  sheetWidthMm: 450,
  sheetHeightMm: 320,
  sides: 2,
  wastePercent: 5,
  makeReadySheets: 2,
  sheetCostMinor: 45,
  clickCostMinor: 4,
  setupCostMinor: 500,
  finishingCostMinor: 0,
  laminationCostMinor: 0,
  laminationMode: 'none',
  foldingCostMinor: 0,
  foldingMode: 'none',
  cuttingCostMinor: 0,
  cuttingMode: 'none',
  cutCount: 1,
  spotUvCostMinor: 0,
  spotUvMode: 'none',
  packingCostMinor: 0,
  packingMode: 'none',
};

const numericFields: Array<keyof PrintMathsForm> = [
  'quantity',
  'productWidthMm',
  'productHeightMm',
  'sheetWidthMm',
  'sheetHeightMm',
  'sides',
  'wastePercent',
  'makeReadySheets',
  'sheetCostMinor',
  'clickCostMinor',
  'setupCostMinor',
  'finishingCostMinor',
  'laminationCostMinor',
  'foldingCostMinor',
  'cuttingCostMinor',
  'cutCount',
  'spotUvCostMinor',
  'packingCostMinor',
];

const modeFields: Array<{ key: keyof PrintMathsForm; options: string[] }> = [
  { key: 'laminationMode', options: ['none', 'per_unit', 'per_sheet', 'per_side_impression'] },
  { key: 'foldingMode', options: ['none', 'per_unit', 'per_sheet'] },
  { key: 'cuttingMode', options: ['none', 'per_unit', 'per_sheet', 'per_cut'] },
  { key: 'spotUvMode', options: ['none', 'per_unit', 'per_sheet', 'per_side_impression'] },
  { key: 'packingMode', options: ['none', 'per_unit', 'flat'] },
];

function formatMoney(minor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((minor || 0) / 100);
}

function humanLabel(key: string) {
  return key
    .replace(/Minor$/, ' (pence)')
    .replace(/Mm$/, ' mm')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());
}

export default function PrintMathsLab() {
  const [form, setForm] = useState<PrintMathsForm>(initialForm);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key: keyof PrintMathsForm, value: number | string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function run() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams(
        Object.entries(form).map(([key, value]) => [key, String(value)]),
      );
      const response = await fetch(`/api/internal/catalog/print-maths?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Print maths calculation failed');
      }
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print maths calculation failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Print Maths Lab</h1>
      <p style={{ color: '#555', marginTop: 6 }}>
        Test sheet fit, ups per sheet, sheets needed, waste, make-ready sheets, base production cost and finishing stack cost.
      </p>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Core print inputs</h2>
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {numericFields.map((key) => (
            <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600 }}>
              <span>{humanLabel(key)}</span>
              <input
                type="number"
                value={form[key] as number}
                onChange={(event) => update(key, Number(event.target.value))}
                style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
              />
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Finishing modes</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Use modes to decide whether a finish charges per unit, sheet, side/impression, cut, or flat job.
        </p>
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {modeFields.map(({ key, options }) => (
            <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600 }}>
              <span>{humanLabel(key)}</span>
              <select
                value={form[key] as string}
                onChange={(event) => update(key, event.target.value)}
                style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <button
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: '10px 16px',
          border: '1px solid #111',
          borderRadius: 8,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Calculating…' : 'Calculate'}
      </button>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #c00', borderRadius: 8, color: '#c00' }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Ups per sheet</strong>
              <div>{result.upsPerSheet}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Total sheets</strong>
              <div>{result.totalSheets}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Impressions</strong>
              <div>{result.impressions}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Base cost</strong>
              <div>{formatMoney((result.materialCostMinor || 0) + (result.printCostMinor || 0) + (result.setupCostTotalMinor || 0), result.currency)}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Finishing cost</strong>
              <div>{formatMoney(result.finishingCostTotalMinor, result.currency)}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Total cost</strong>
              <div>{formatMoney(result.totalCostMinor, result.currency)}</div>
            </div>
            <div style={{ padding: 14, background: '#f6f6f6', borderRadius: 10 }}>
              <strong>Unit cost</strong>
              <div>{formatMoney(result.unitCostMinor, result.currency)}</div>
            </div>
          </div>

          {Array.isArray(result.costLines) && result.costLines.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Cost line</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Qty</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Unit</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.costLines.map((line: any) => (
                  <tr key={line.code}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{line.label}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>{line.quantity}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                      {formatMoney(line.unitCostMinor, result.currency)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                      {formatMoney(line.totalMinor, result.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <details>
            <summary>Raw result</summary>
            <pre style={{ marginTop: 8, padding: 16, background: '#f6f6f6', borderRadius: 8, overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
