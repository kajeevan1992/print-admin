'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CreditCard, DatabaseZap, Rocket, Search, ShieldAlert, Store, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Button } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';

const windows = ['This month', 'Quarter to date', 'Year to date'];

const tenantRows = [
  { id: 't1', tenant: 'Northstar Print', mrr: 2400, seats: 18, stores: 3, status: 'active', risk: 'healthy' },
  { id: 't2', tenant: 'Blue Peak Media', mrr: 1800, seats: 12, stores: 2, status: 'trial', risk: 'watch' },
  { id: 't3', tenant: 'Studio Press Hub', mrr: 3200, seats: 26, stores: 4, status: 'active', risk: 'healthy' },
  { id: 't4', tenant: 'Label Forge', mrr: 950, seats: 8, stores: 1, status: 'past_due', risk: 'critical' }
];

const deploymentRows = [
  { id: 'd1', tenant: 'Northstar Print', environment: 'production', stage: 'ready', owner: 'Owner Ops', date: '2026-04-18' },
  { id: 'd2', tenant: 'Blue Peak Media', environment: 'staging', stage: 'queued', owner: 'Launch Team', date: '2026-04-19' },
  { id: 'd3', tenant: 'Label Forge', environment: 'production', stage: 'attention', owner: 'Support', date: '2026-04-17' }
];

const invoiceRows = [
  { id: 'i1', tenant: 'Northstar Print', amount: 2400, status: 'paid', due: '2026-04-30' },
  { id: 'i2', tenant: 'Blue Peak Media', amount: 1800, status: 'pending', due: '2026-04-28' },
  { id: 'i3', tenant: 'Label Forge', amount: 950, status: 'past_due', due: '2026-04-21' }
];

function money(value: number) {
  return `£${value.toLocaleString()}`;
}

function tone(value: string) {
  if (value === 'critical' || value === 'past_due' || value === 'attention') return 'border-rose-400/25 bg-rose-400/10 text-rose-200';
  if (value === 'watch' || value === 'pending' || value === 'queued' || value === 'trial') return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
}

export function OwnerReportsPage() {
  const [windowLabel, setWindowLabel] = useState(windows[0]);
  const [query, setQuery] = useState('');

  const filteredTenants = useMemo(() => tenantRows.filter((row) => {
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${row.tenant} ${row.status} ${row.risk}`.toLowerCase().includes(text);
  }), [query]);

  const metrics = useMemo(() => {
    const mrr = filteredTenants.reduce((sum, row) => sum + row.mrr, 0);
    const seats = filteredTenants.reduce((sum, row) => sum + row.seats, 0);
    const stores = filteredTenants.reduce((sum, row) => sum + row.stores, 0);
    const atRisk = filteredTenants.filter((row) => row.risk !== 'healthy' || row.status === 'past_due').length;
    return { mrr, seats, stores, atRisk };
  }, [filteredTenants]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Owner Reports"
        subtitle="Track tenant revenue, licence usage, billing exposure, and rollout readiness across your SaaS estate."
        actions={<div className="flex gap-2"><Button>Export summary</Button><Button>Schedule digest</Button></div>}
      />

      <div className="flex flex-wrap gap-2">
        {windows.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setWindowLabel(item)}
            className={`rounded-xl border px-3 py-2 text-sm ${windowLabel === item ? 'border-accent/40 bg-accent/10 text-text' : 'border-white/10 bg-white/[0.02] text-textMuted'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={CreditCard} label="MRR tracked" value={money(metrics.mrr)} helper={windowLabel} />
        <MetricCard icon={Users2} label="Seats in use" value={String(metrics.seats)} helper="Across active tenants" />
        <MetricCard icon={Store} label="Live stores" value={String(metrics.stores)} helper="Tenant storefronts" />
        <MetricCard icon={ShieldAlert} label="At risk" value={String(metrics.atRisk)} helper="Billing or health attention" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Tenant portfolio</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Revenue and licence posture</h2>
            </div>
            <div className="relative w-full max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenants, status, risk..." className="pl-10" />
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'tenant', header: 'Tenant', render: (row) => row.tenant },
              { key: 'mrr', header: 'MRR', render: (row) => money(row.mrr) },
              { key: 'seats', header: 'Seats', render: (row) => String(row.seats) },
              { key: 'stores', header: 'Stores', render: (row) => String(row.stores) },
              { key: 'status', header: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-xs uppercase ${tone(row.status)}`}>{row.status.replace('_', ' ')}</span> },
              { key: 'risk', header: 'Risk', render: (row) => <span className={`rounded-full border px-2 py-1 text-xs uppercase ${tone(row.risk)}`}>{row.risk}</span> }
            ]}
            rows={filteredTenants}
            rowKey={(row) => row.id}
          />
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Owner rollout queue</p>
            {deploymentRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.tenant}</p>
                    <p className="mt-1 text-xs text-textMuted">{row.environment} · {row.owner} · {row.date}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs uppercase ${tone(row.stage)}`}>{row.stage}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Billing watchlist</p>
            {invoiceRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.tenant}</p>
                    <p className="mt-1 text-xs text-textMuted">Due {row.due}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{money(row.amount)}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs uppercase ${tone(row.status)}`}>{row.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Owner guidance</p>
            <div className="grid gap-3">
              <Guidance icon={Rocket} title="Push launch readiness" copy="Move tenants from queued to launch-ready with demo pack and deployment checks." />
              <Guidance icon={DatabaseZap} title="Prepare API rollout" copy="Use MRR, seats, and risk posture to choose who gets API/database integration first." />
              <Guidance icon={BarChart3} title="Commercial focus" copy="Use the billing watchlist and tenant portfolio to prioritise retention and upsell actions." />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: typeof CreditCard; label: string; value: string; helper: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-textMuted">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-textMuted"><Icon size={18} /></div>
      </div>
    </Card>
  );
}

function Guidance({ icon: Icon, title, copy }: { icon: typeof Rocket; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-textMuted"><Icon size={16} /></div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-textMuted">{copy}</p>
        </div>
      </div>
    </div>
  );
}
