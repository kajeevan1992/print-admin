'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Rocket, Search, Sparkles, Users2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { ownerOnboardingService } from '@/services/owner-onboarding.service';
import type { BillingPlan, OnboardingStatus, OwnerOnboardingRecord, Region } from '@/data/owner-onboarding';

const statusTone: Record<OnboardingStatus, string> = {
  draft: 'border-white/10 bg-white/[0.05] text-white',
  invited: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  configuring: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  ready_for_launch: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  live: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100'
};

const emptyRecord: OwnerOnboardingRecord = {
  id: '',
  tenantName: '',
  primaryContact: '',
  email: '',
  company: '',
  billingPlan: 'starter',
  region: 'uk',
  seats: 5,
  stores: 1,
  status: 'draft',
  invitationState: 'not_sent',
  deploymentState: 'not_started',
  demoPack: 'none',
  notes: ''
};

export function OwnerOnboardingPage() {
  const [rows, setRows] = useState<OwnerOnboardingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OnboardingStatus>('all');
  const [plan, setPlan] = useState<'all' | BillingPlan>('all');
  const [editing, setEditing] = useState<OwnerOnboardingRecord | null>(null);
  const [form, setForm] = useState<OwnerOnboardingRecord>(emptyRecord);

  async function load() {
    const data = await ownerOnboardingService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.tenantName} ${row.primaryContact} ${row.email} ${row.company} ${row.notes}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (status !== 'all' && row.status !== status) return false;
    if (plan !== 'all' && row.billingPlan !== plan) return false;
    return true;
  }), [rows, search, status, plan]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const kpis = useMemo(() => ({
    invited: filtered.filter((row) => row.invitationState === 'sent').length,
    configuring: filtered.filter((row) => row.status === 'configuring').length,
    launchReady: filtered.filter((row) => row.status === 'ready_for_launch').length,
    seats: filtered.reduce((sum, row) => sum + row.seats, 0)
  }), [filtered]);

  function openCreate() {
    const next = { ...emptyRecord, id: `onb-${Date.now()}` };
    setEditing(next);
    setForm(next);
  }

  function openEdit(record: OwnerOnboardingRecord) {
    setEditing(record);
    setForm(record);
  }

  async function save() {
    await ownerOnboardingService.save(form);
    setEditing(null);
    await load();
    setSelectedId(form.id);
  }

  async function saveAndReload(record: OwnerOnboardingRecord) {
    await ownerOnboardingService.save(record);
    await load();
    setSelectedId(record.id);
  }

  async function duplicate(record: OwnerOnboardingRecord) {
    const copy = { ...record, id: `onb-${Date.now()}`, tenantName: `${record.tenantName} Copy`, email: `copy+${record.email}`, status: 'draft' as const, invitationState: 'not_sent' as const, deploymentState: 'not_started' as const, demoPack: 'none' as const };
    await ownerOnboardingService.save(copy);
    await load();
    setSelectedId(copy.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Owner Onboarding"
        subtitle="Create tenants, invite their first admin users, and move accounts from draft into launch-ready without wiring the backend yet."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={() => void ownerOnboardingService.reset().then(load)}>Reset seed data</Button><PrimaryButton onClick={openCreate}>Create tenant</PrimaryButton></div>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Mail} label="Invites sent" value={String(kpis.invited)} />
        <MetricCard icon={Building2} label="Configuring" value={String(kpis.configuring)} />
        <MetricCard icon={Rocket} label="Launch ready" value={String(kpis.launchReady)} />
        <MetricCard icon={Users2} label="Seat capacity" value={String(kpis.seats)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, contact, or email..." icon={<Search className="size-4" />} />
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | OnboardingStatus)} options={[{ value: 'all', label: 'All stages' }, { value: 'draft', label: 'Draft' }, { value: 'invited', label: 'Invited' }, { value: 'configuring', label: 'Configuring' }, { value: 'ready_for_launch', label: 'Ready for launch' }, { value: 'live', label: 'Live' }]} />
            <Select value={plan} onChange={(e) => setPlan(e.target.value as 'all' | BillingPlan)} options={[{ value: 'all', label: 'All plans' }, { value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} />
          </div>

          <div className="space-y-3">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === row.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${statusTone[row.status]}`}>{row.status.replaceAll('_', ' ')}</span>
                      <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{row.billingPlan}</span>
                      <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{row.region}</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">{row.tenantName}</p>
                    <p className="mt-1 text-sm text-textMuted">{row.primaryContact} · {row.email}</p>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-3">
                  <p>Invite: <span className="text-white">{row.invitationState.replace('_', ' ')}</span></p>
                  <p>Deploy: <span className="text-white">{row.deploymentState.replace('_', ' ')}</span></p>
                  <p>Demo: <span className="text-white">{row.demoPack.replace('_', ' ')}</span></p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Onboarding spotlight</p>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.tenantName}</h2>
                  <p className="mt-2 text-sm text-textMuted">{selected.company} · {selected.primaryContact} · {selected.email}</p>
                </div>
                <Info label="Plan" value={selected.billingPlan} />
                <Info label="Seats / stores" value={`${selected.seats} seats · ${selected.stores} stores`} />
                <Info label="Invite state" value={selected.invitationState.replaceAll('_', ' ')} />
                <Info label="Deployment" value={selected.deploymentState.replaceAll('_', ' ')} />
                <Info label="Demo pack" value={selected.demoPack.replaceAll('_', ' ')} />
                <Info label="Notes" value={selected.notes || '—'} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEdit(selected)}>Edit</Button>
                  <Button onClick={() => void saveAndReload({ ...selected, invitationState: 'sent', status: selected.status === 'draft' ? 'invited' : selected.status })}>Send invite</Button>
                  <Button onClick={() => void saveAndReload({ ...selected, invitationState: 'accepted', status: 'configuring' })}>Accept invite</Button>
                  <Button onClick={() => void saveAndReload({ ...selected, deploymentState: 'queued', demoPack: selected.demoPack === 'none' ? 'uploaded' : selected.demoPack, status: selected.status === 'configuring' ? 'ready_for_launch' : selected.status })}>Queue launch</Button>
                  <Button onClick={() => void duplicate(selected)}>Duplicate</Button>
                  <Button onClick={() => void ownerOnboardingService.remove(selected.id).then(load)}>Delete</Button>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-textMuted">Select a tenant to manage onboarding.</p>}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Owner guidance</p>
            <ul className="mt-4 space-y-2 text-sm text-textMuted">
              <li>Start in <span className="text-white">Draft</span> while shaping seats, stores, and billing plan.</li>
              <li>Move to <span className="text-white">Invited</span> once the first admin invite is sent.</li>
              <li>Use <span className="text-white">Ready for launch</span> when demo, deployment, and onboarding docs are complete.</li>
            </ul>
          </Card>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <Card className="w-full max-w-3xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Owner onboarding</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{editing.id ? 'Edit tenant onboarding' : 'Create tenant onboarding'}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tenant name"><Input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} /></Field>
              <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
              <Field label="Primary contact"><Input value={form.primaryContact} onChange={(e) => setForm({ ...form, primaryContact: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Billing plan"><Select value={form.billingPlan} onChange={(e) => setForm({ ...form, billingPlan: e.target.value as BillingPlan })} options={[{ value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} /></Field>
              <Field label="Region"><Select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Region })} options={[{ value: 'uk', label: 'UK' }, { value: 'eu', label: 'EU' }, { value: 'us', label: 'US' }]} /></Field>
              <Field label="Seats"><Input type="number" value={String(form.seats)} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) || 1 })} /></Field>
              <Field label="Stores"><Input type="number" value={String(form.stores)} onChange={(e) => setForm({ ...form, stores: Number(e.target.value) || 1 })} /></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OnboardingStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'invited', label: 'Invited' }, { value: 'configuring', label: 'Configuring' }, { value: 'ready_for_launch', label: 'Ready for launch' }, { value: 'live', label: 'Live' }]} /></Field>
              <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={() => void save()}>Save onboarding</PrimaryButton></div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <Card><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-200"><Icon className="size-4" /></div><div><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p></div></div></Card>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm text-white">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm text-textMuted"><span>{label}</span>{children}</label>; }
