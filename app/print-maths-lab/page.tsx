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
};

function formatMoney(minor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((minor || 0) / 100);
}

export default function PrintMathsLab() {
  const [form, setForm] = useState<PrintMathsForm>(initialForm);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key: keyof PrintMathsForm, value: number) {
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
    <main style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Print Maths Lab</h1>
      <p style={{ color: '#555', marginTop: 6 }}>
        Test sheet fit, ups per sheet, sheets needed, waste, make-ready sheets and basic production cost.
      </p>

      <section
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {(Object.keys(form) as Array<keyof PrintMathsForm>).map((key) => (
          <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600 }}>
            <span>{key}</span>
            <input
              type="number"
              value={form[key]}
              onChange={(event) => update(key, Number(event.target.value))}
              style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
            />
          </label>
        ))}
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
