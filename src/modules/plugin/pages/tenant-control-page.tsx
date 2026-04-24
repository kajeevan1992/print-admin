'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Globe, Package, Search, TriangleAlert, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { BaseModal } from '@/components/modals/base-modal';
import { tenantControlService } from '@/services/tenant-control.service';
import type { TenantActivation, TenantControlRecord, TenantEnvironment } from '@/data/tenant-control';

const environmentOptions: Array<'all' | TenantEnvironment> = ['all', 'staging', 'launch_ready', 'live', 'attention'];
const riskTone = {
  healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
} as const;

const emptyRecord: TenantControlRecord = {
  id: '', company: '', owner: '', segment: 'Starter', environment: 'staging', activation: 'not_started', stores: 1,
  domainsReady: false, catalogReady: false, checkoutReady: false, risk: 'healthy', notes: ''
};

export function TenantControlPage() {
  const [rows, setRows] = useState<TenantControlRecord[]>([]);
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState<'all' | TenantEnvironment>('all');
  const [editing, setEditing] = useState<TenantControlRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const data = await tenantControlService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.company} ${row.owner} ${row.segment} ${row.notes}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (environment === 'all' || row.environment === environment);
  }), [rows, search, environment]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const kpis = useMemo(() => ({
    live: filtered.filter((item) => item.environment === 'live').length,
    blocked: filtered.filter((item) => item.risk === 'critical').length,
    stores: filtered.reduce((sum, item) => sum + item.stores, 0),
    launchReady: filtered.filter((item) => item.environment === 'launch_ready').length
  }), [filtered]);

  async function save(record: TenantControlRecord) {
    await tenantControlService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }
  async function remove(record: TenantControlRecord) {
    await tenantControlService.remove(record.id);
    await load();
  }
  async function resetAll() { await tenantControlService.reset(); await load(); }
  async function toggleReadiness(record: TenantControlRecord) {
    await tenantControlService.save({
      ...record,
      environment: record.environment === 'launch_ready' ? 'attention' : 'launch_ready',
      checkoutReady: record.environment === 'launch_ready' ? false : true,
      risk: record.environment === 'launch_ready' ? 'watch' : 'healthy'
    });
    await load();
  }
  async function activate(record: TenantControlRecord) {
    await tenantControlService.save({ ...record, activation: 'live', environment: 'live', domainsReady: true, catalogReady: true, checkoutReady: true, risk: 'healthy' });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Tenant Control"
        subtitle="Provision storefronts, review launch readiness, and manage tenant activation without leaving the owner control plane."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={resetAll}>Reset seed data</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `tenant-${Date.now()}` })}>Add tenant record</PrimaryButton></div>}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard icon={Building2} label="Live tenants" value={String(kpis.live)} helper="Tenants currently serving live stores." />
        <MetricCard icon={Globe} label="Stores in estate" value={String(kpis.stores)} helper="All stores managed across visible tenants." />
        <MetricCard icon={Package} label="Launch ready" value={String(kpis.launchReady)} helper="Ready to move into live activation." />
        <MetricCard icon={TriangleAlert} label="Blocked" value={String(kpis.blocked)} helper="Need attention before rollout || support handoff." />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" /><Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, owner, segment..." /></div>
            <Select value={environment} onChange={(e) => setEnvironment(e.target.value as 'all' | TenantEnvironment)} options={environmentOptions.map((item) => ({ value: item, label: item === 'all' ? 'All environments' : item.replace('_', ' ') }))} />
          </div>
          <div className="mt-4 space-y-3">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === row.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{row.segment}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${riskTone[row.risk]}`}>{row.risk}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{row.company}</h3>
                    <p className="mt-1 text-sm text-textMuted">{row.owner} · {row.environment.replace('_', ' ')} · {row.stores} stores</p>
                  </div>
                  <div className="text-right text-xs text-textMuted">
                    <p>Activation</p>
                    <p className="mt-2 font-semibold text-white">{row.activation.replace('_', ' ')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Tenant spotlight</p>
            {selected ? <div className="mt-4 space-y-4">
              <div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.company}</h2><p className="mt-2 text-sm text-textMuted">{selected.owner} · {selected.segment} · {selected.environment.replace('_', ' ')}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Stores" value={String(selected.stores)} />
                <Info label="Activation" value={selected.activation.replace('_', ' ')} />
                <Info label="Domains" value={selected.domainsReady ? 'Ready' : 'Blocked'} />
                <Info label="Checkout" value={selected.checkoutReady ? 'Ready' : 'Needs work'} />
              </div>
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted">{selected.notes}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditing(selected)}>Edit record</Button>
                <Button onClick={() => toggleReadiness(selected)}>{selected.environment === 'launch_ready' ? 'Drop to attention' : 'Mark launch ready'}</Button>
                <PrimaryButton onClick={() => activate(selected)}>Activate live</PrimaryButton>
                <Button onClick={() => remove(selected)}>Delete</Button>
              </div>
            </div> : <p className="mt-4 text-sm text-textMuted">Select a tenant to review launch readiness and activation controls.</p>}
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Rollout checklist</p>
            <div className="mt-4 space-y-3 text-sm text-textMuted">
              <p>• Domain routing and SSL ready</p>
              <p>• Catalog structure approved</p>
              <p>• Checkout fields reviewed</p>
              <p>• Support handoff completed</p>
            </div>
          </Card>
        </div>
      </div>
      <TenantModal record={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function TenantModal({ record, onClose, onSave }: { record: TenantControlRecord | null; onClose: () => void; onSave: (record: TenantControlRecord) => void | Promise<void> }) {
  const [draft, setDraft] = useState<TenantControlRecord | null>(record);
  useEffect(() => setDraft(record), [record]);
  if (!draft) return null;
  return <BaseModal open={Boolean(record)} onClose={onClose} title={draft.company || 'Tenant record'} description="Manage provisioning and rollout readiness.">
    <div className="grid gap-3 md:grid-cols-2">
      <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Company" />
      <Input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
      <Input value={draft.segment} onChange={(e) => setDraft({ ...draft, segment: e.target.value })} placeholder="Segment" />
      <Input type="number" value={String(draft.stores)} onChange={(e) => setDraft({ ...draft, stores: Number(e.target.value) || 1 })} placeholder="Stores" />
      <Select value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value as TenantEnvironment })} options={[{ value: 'staging', label: 'Staging' }, { value: 'launch_ready', label: 'Launch ready' }, { value: 'live', label: 'Live' }, { value: 'attention', label: 'Attention' }]} />
      <Select value={draft.activation} onChange={(e) => setDraft({ ...draft, activation: e.target.value as TenantActivation })} options={[{ value: 'not_started', label: 'Not started' }, { value: 'configuring', label: 'Configuring' }, { value: 'qa', label: 'QA' }, { value: 'live', label: 'Live' }]} />
      <Select value={draft.risk} onChange={(e) => setDraft({ ...draft, risk: e.target.value as TenantControlRecord['risk'] })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
      <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" />
    </div>
    <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><PrimaryButton onClick={() => onSave(draft)}>Save tenant</PrimaryButton></div>
  </BaseModal>;
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string; helper: string }) { return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p><p className="mt-2 text-sm text-textMuted">{helper}</p></div><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200"><Icon size={18} /></div></div></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>; }
