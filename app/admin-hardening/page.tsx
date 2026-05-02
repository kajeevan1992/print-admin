'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, KeyRound, Package, ShieldCheck, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

type Status = 'ok' | 'warning' | 'error' | 'loading';
type Probe = { id: string; label: string; url: string; group: 'admin' | 'super-admin' | 'storefront' | 'orders'; status: Status; summary: string; data?: any; error?: string };

const probesSeed: Probe[] = [
  { id: 'products', label: 'Products', url: '/api/internal/catalog/products', group: 'admin', status: 'loading', summary: 'Checking products...' },
  { id: 'categories', label: 'Categories', url: '/api/internal/catalog/categories', group: 'admin', status: 'loading', summary: 'Checking categories...' },
  { id: 'materials', label: 'Materials', url: '/api/internal/catalog/materials', group: 'admin', status: 'loading', summary: 'Checking materials...' },
  { id: 'readiness', label: 'Product publish readiness', url: '/api/internal/catalog/product-readiness', group: 'admin', status: 'loading', summary: 'Checking readiness...' },
  { id: 'storefront-products', label: 'Storefront products', url: '/api/internal/catalog/storefront-products?includeDrafts=true', group: 'storefront', status: 'loading', summary: 'Checking storefront catalog...' },
  { id: 'checkout-health', label: 'Checkout health', url: '/api/internal/storefront/health', group: 'storefront', status: 'loading', summary: 'Checking checkout...' },
  { id: 'order-workflow', label: 'Order workflow', url: '/api/internal/catalog/order-workflow', group: 'orders', status: 'loading', summary: 'Checking order workflow...' },
  { id: 'orders', label: 'Storefront orders', url: '/api/internal/storefront/orders', group: 'orders', status: 'loading', summary: 'Checking orders...' },
];

function groupIcon(group: Probe['group']) {
  if (group === 'admin') return Package;
  if (group === 'super-admin') return Users;
  if (group === 'orders') return ShoppingCart;
  return Sparkles;
}

function statusTone(status: Status) {
  if (status === 'ok') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
  if (status === 'warning') return 'border-amber-400/20 bg-amber-400/10 text-amber-100';
  if (status === 'error') return 'border-rose-400/20 bg-rose-400/10 text-rose-100';
  return 'border-white/10 bg-white/[0.04] text-textMuted';
}

function summarise(id: string, payload: any) {
  const data = payload?.data || payload || {};
  const items = data.items || data.products || data.categories || data.materials || [];
  if (id === 'readiness') {
    const s = data.summary || {};
    const blocked = Number(s.blocked || 0);
    return { status: blocked > 0 ? 'warning' as Status : 'ok' as Status, summary: `${s.ready || 0} ready · ${blocked} blocked · ${s.total || data.items?.length || 0} total` };
  }
  if (id === 'checkout-health') {
    return { status: data.ready ? 'ok' as Status : 'warning' as Status, summary: data.ready ? 'Checkout ready' : `${data.errors?.length || 0} checkout issue(s)` };
  }
  if (id === 'order-workflow') {
    const s = data.summary || data;
    return { status: 'ok' as Status, summary: `${s.total || data.items?.length || 0} workflow item(s)` };
  }
  if (id === 'storefront-products') {
    const count = Number(data.count ?? items.length ?? 0);
    return { status: count > 0 ? 'ok' as Status : 'warning' as Status, summary: `${count} storefront product(s)` };
  }
  if (id === 'orders') {
    const count = (data.orders || data.finalOrders || data.draftOrders || []).length;
    return { status: 'ok' as Status, summary: `${count} order record(s)` };
  }
  const count = Number(data.count ?? items.length ?? 0);
  return { status: count > 0 ? 'ok' as Status : 'warning' as Status, summary: `${count} record(s)` };
}

export default function AdminHardeningPage() {
  const [probes, setProbes] = useState<Probe[]>(probesSeed);
  const [checkedAt, setCheckedAt] = useState<string>('');

  async function runChecks() {
    setProbes(probesSeed.map((probe) => ({ ...probe, status: 'loading', summary: 'Checking...' })));
    const results = await Promise.all(probesSeed.map(async (probe) => {
      try {
        const res = await fetch(probe.url, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`);
        const s = summarise(probe.id, json);
        return { ...probe, ...s, data: json };
      } catch (err) {
        return { ...probe, status: 'error' as Status, summary: err instanceof Error ? err.message : 'Check failed', error: err instanceof Error ? err.message : 'Check failed' };
      }
    }));
    setProbes(results);
    setCheckedAt(new Date().toISOString());
  }

  useEffect(() => { runChecks(); }, []);

  const summary = useMemo(() => ({
    ok: probes.filter((p) => p.status === 'ok').length,
    warnings: probes.filter((p) => p.status === 'warning').length,
    errors: probes.filter((p) => p.status === 'error').length,
    loading: probes.filter((p) => p.status === 'loading').length,
  }), [probes]);

  const groups = useMemo(() => ['admin', 'storefront', 'orders', 'super-admin'] as const, []);

  return <div className="space-y-6">
    <PageHeader title="Admin + Super Admin Hardening" subtitle="One place to check catalog readiness, storefront publish status, checkout health, order workflow and platform controls before live testing." />

    <Card className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v338 hardening dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Live readiness overview</h2>
          <p className="mt-1 text-sm text-textMuted">Checks existing internal APIs only. No hosted theme changes.</p>
        </div>
        <button onClick={runChecks} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Run checks</button>
      </div>
    </Card>

    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-4"><div className="flex items-center gap-2 text-emerald-100"><CheckCircle2 size={18}/><p className="font-semibold">OK</p></div><p className="mt-3 text-3xl font-black text-white">{summary.ok}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-amber-100"><AlertTriangle size={18}/><p className="font-semibold">Warnings</p></div><p className="mt-3 text-3xl font-black text-white">{summary.warnings}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-rose-100"><AlertTriangle size={18}/><p className="font-semibold">Errors</p></div><p className="mt-3 text-3xl font-black text-white">{summary.errors}</p></Card>
      <Card className="p-4"><div className="flex items-center gap-2 text-sky-100"><Database size={18}/><p className="font-semibold">Checked</p></div><p className="mt-3 text-sm text-textMuted">{checkedAt ? new Date(checkedAt).toLocaleString() : 'Running...'}</p></Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => {
        const Icon = groupIcon(group as Probe['group']);
        const groupProbes = probes.filter((probe) => probe.group === group);
        if (group === 'super-admin') {
          return <Card key={group} className="p-5">
            <div className="flex items-center gap-2 text-white"><Icon size={18}/><h3 className="font-semibold">Super Admin controls</h3></div>
            <div className="mt-4 grid gap-3">
              <HardeningLink icon={Users} title="Tenant Control" href="/tenant-control" desc="Check tenant list, tenant status and platform-level tenant tools." />
              <HardeningLink icon={Database} title="Database Manager" href="/database-manager" desc="Review database connection/status and backup-related tools." />
              <HardeningLink icon={KeyRound} title="Owner API Keys" href="/owner-api-keys" desc="Review API key visibility and external access controls." />
              <HardeningLink icon={ShieldCheck} title="Feature Flags" href="/feature-flags" desc="Check tenant/platform feature enablement before live test." />
            </div>
          </Card>;
        }
        return <Card key={group} className="p-5">
          <div className="flex items-center gap-2 text-white"><Icon size={18}/><h3 className="font-semibold capitalize">{group.replace('-', ' ')}</h3></div>
          <div className="mt-4 space-y-3">
            {groupProbes.map((probe) => <div key={probe.id} className={`rounded-2xl border p-4 ${statusTone(probe.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold">{probe.label}</p><p className="mt-1 text-sm opacity-80">{probe.summary}</p></div>
                <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-bold uppercase">{probe.status}</span>
              </div>
              <p className="mt-2 text-[11px] opacity-60">{probe.url}</p>
            </div>)}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

function HardeningLink({ icon: Icon, title, desc, href }: { icon: any; title: string; desc: string; href: string }) {
  return <a href={href} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
    <div className="flex items-center gap-2 text-white"><Icon size={16}/><p className="font-semibold">{title}</p></div>
    <p className="mt-1 text-sm leading-5 text-textMuted">{desc}</p>
  </a>;
}
