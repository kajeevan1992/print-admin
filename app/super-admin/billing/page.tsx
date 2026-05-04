'use client';

import { useEffect, useState } from 'react';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/internal/platform/billing')
      .then((r) => r.json())
      .then((json) => setData(json.data));
  }, []);

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
        <h2 className="font-semibold">Plans</h2>
        <ul>
          {data.plans.map((p: any) => (
            <li key={p.id}>{p.name} — £{(p.monthlyPriceMinor / 100).toFixed(2)}/mo</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Subscriptions</h2>
        <ul>
          {data.subscriptions.map((s: any) => (
            <li key={s.id}>{s.tenant.name} — {s.plan?.name} ({s.status})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Invoices</h2>
        <ul>
          {data.invoices.map((i: any) => (
            <li key={i.id}>{i.invoiceNumber} — £{(i.totalMinor / 100).toFixed(2)} ({i.status})</li>
          ))}
        </ul>
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
