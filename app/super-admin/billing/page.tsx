'use client';

import { useEffect, useState } from 'react';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/internal/platform/billing');
    const json = await res.json();
    setData(json.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(payload: any) {
    setLoading(true);
    await fetch('/api/internal/platform/billing/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await load();
    setLoading(false);
  }

  if (!data) return <div>Loading billing...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Super Admin Billing</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card label="MRR" value={`£${(data.summary.mrrMinor / 100).toFixed(2)}`} />
        <Card label="Outstanding" value={`£${(data.summary.outstandingMinor / 100).toFixed(2)}`} />
        <Card label="Payments" value={`£${(data.summary.paidMinor / 100).toFixed(2)}`} />
      </div>

      <section>
        <h2 className="font-semibold">Subscriptions</h2>
        <ul className="space-y-2">
          {data.subscriptions.map((s: any) => (
            <li key={s.id} className="border p-3 rounded-xl flex justify-between items-center">
              <div>
                {s.tenant.name} — {s.plan?.name} ({s.status})
              </div>
              <div className="flex gap-2">
                <button disabled={loading} onClick={() => runAction({ action: 'assign-plan', tenantId: s.tenant.id, planSlug: 'starter' })}>Starter</button>
                <button disabled={loading} onClick={() => runAction({ action: 'assign-plan', tenantId: s.tenant.id, planSlug: 'growth' })}>Growth</button>
                <button disabled={loading} onClick={() => runAction({ action: 'assign-plan', tenantId: s.tenant.id, planSlug: 'enterprise' })}>Enterprise</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Invoices</h2>
        <ul className="space-y-2">
          {data.invoices.map((i: any) => (
            <li key={i.id} className="border p-3 rounded-xl flex justify-between items-center">
              <div>
                {i.invoiceNumber} — £{(i.totalMinor / 100).toFixed(2)} ({i.status})
              </div>
              <div className="flex gap-2">
                <button disabled={loading} onClick={() => runAction({ action: 'mark-paid', invoiceId: i.id })}>Mark Paid</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Generate Invoice</h2>
        <button
          disabled={loading}
          onClick={() => runAction({ action: 'generate-invoice', tenantId: data.subscriptions[0]?.tenant.id, subtotalMinor: 24900 })}
        >
          Generate Test Invoice (£249)
        </button>
      </section>
    </div>
  );
}

function Card({ label, value }: any) {
  return (
    <div className="border p-4 rounded-xl">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
