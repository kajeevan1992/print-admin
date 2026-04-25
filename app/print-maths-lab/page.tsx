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
};

const initialForm: PrintMathsForm = {
  quantity: 100,
  productWidthMm: 85,
  productHeightMm: 55,
  sheetWidthMm: 450,
  sheetHeightMm: 320,
  sides: 2,
  wastePercent: 5,
};

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
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Print Maths Lab</h1>
      <p style={{ color: '#555', marginTop: 6 }}>
        Test sheet fit, ups per sheet, sheets needed, waste sheets and impressions.
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
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Result</h2>
          <pre style={{ marginTop: 8, padding: 16, background: '#f6f6f6', borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
