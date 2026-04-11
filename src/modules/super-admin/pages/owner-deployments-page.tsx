'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { superAdminService } from '@/services/super-admin.service';
import type { DeploymentRecord } from '@/data/super-admin';

type DeploymentStatus = DeploymentRecord['status'] | 'all';
type DeploymentEnv = DeploymentRecord['environment'] | 'all';

const emptyForm: DeploymentRecord = {
  id: '',
  tenant: '',
  environment: 'production',
  status: 'queued',
  owner: 'Owner Ops',
  scheduledFor: new Date().toISOString().slice(0, 10),
  note: ''
};

const statusTone: Record<DeploymentRecord['status'], string> = {
  queued: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  deploying: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  ready: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  attention: 'border-rose-400/30 bg-rose-400/10 text-rose-100'
};

function nextStatus(status: DeploymentRecord['status']): DeploymentRecord['status'] {
  switch (status) {
    case 'queued': return 'deploying';
    case 'deploying': return 'ready';
    case 'ready': return 'ready';
    case 'attention': return 'queued';
  }
}

export function OwnerDeploymentsPage() {
  const [items, setItems] = useState<DeploymentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DeploymentStatus>('all');
  const [environment, setEnvironment] = useState<DeploymentEnv>('all');
  const [editing, setEditing] = useState<DeploymentRecord | null>(null);
  const [form, setForm] = useState<DeploymentRecord>(emptyForm);

  async function load() {
    const rows = await superAdminService.listDeployments();
    setItems(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => items.filter((item) => {
    const haystack = `${item.tenant} ${item.owner} ${item.note} ${item.environment} ${item.status}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (environment !== 'all' && item.environment !== environment) return false;
    return true;
  }), [environment, items, search, status]);

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    queued: rows.filter((item) => item.status === 'queued').length,
    deploying: rows.filter((item) => item.status === 'deploying').length,
    attention: rows.filter((item) => item.status === 'attention').length,
    ready: rows.filter((item) => item.status === 'ready').length
  }), [rows]);

  function openCreate() {
    const next = { ...emptyForm, id: `dep-${Date.now()}` };
    setEditing(next);
    setForm(next);
  }

  function openEdit(record: DeploymentRecord) {
    setEditing(record);
    setForm(record);
  }

  async function save() {
    await superAdminService.saveDeployment(form);
    setEditing(null);
    await load();
    setSelectedId(form.id);
  }

  async function updateRecord(record: DeploymentRecord) {
    await superAdminService.saveDeployment(record);
    await load();
    setSelectedId(record.id);
  }

  async function duplicate(record: DeploymentRecord) {
    const copy = { ...record, id: `dep-${Date.now()}`, tenant: `${record.tenant} Copy`, status: 'queued' as const };
    await superAdminService.saveDeployment(copy);
    await load();
    setSelectedId(copy.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Deployments"
        subtitle="Track rollout queue, production/staging readiness, deployment risk, and launch ownership across customer tenants."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={() => void superAdminService.resetDeployments().then(load)}>Reset seed data</Button><PrimaryButton onClick={openCreate}>Add deployment</PrimaryButton></div>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label="Queued" value={String(kpis.queued)} />
        <MetricCard label="Deploying" value={String(kpis.deploying)} />
        <MetricCard label="Attention" value={String(kpis.attention)} />
        <MetricCard label="Ready" value={String(kpis.ready)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, owner, or note..." />
            <Select value={status} onChange={(e) => setStatus(e.target.value as DeploymentStatus)} options={[{ value: 'all', label: 'All status' }, { value: 'queued', label: 'Queued' }, { value: 'deploying', label: 'Deploying' }, { value: 'ready', label: 'Ready' }, { value: 'attention', label: 'Attention' }]} />
            <Select value={environment} onChange={(e) => setEnvironment(e.target.value as DeploymentEnv)} options={[{ value: 'all', label: 'All environments' }, { value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'demo', label: 'Demo' }]} />
          </div>

          <div className="space-y-3">
            {rows.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${statusTone[item.status]}`}>{item.status}</span>
                      <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{item.environment}</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">{item.tenant}</p>
                    <p className="mt-1 text-sm text-textMuted">{item.owner} · scheduled {item.scheduledFor}</p>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); openEdit(item); }}>Edit</Button>
                </div>
                <p className="mt-3 text-sm text-textMuted">{item.note}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Deployment spotlight</p>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.tenant}</h2>
                  <p className="mt-2 text-sm text-textMuted">{selected.environment} · {selected.owner} · {selected.scheduledFor}</p>
                </div>
                <Info label="Status" value={selected.status} />
                <Info label="Note" value={selected.note || '—'} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEdit(selected)}>Edit</Button>
                  <Button onClick={() => void updateRecord({ ...selected, status: nextStatus(selected.status) })}>Advance stage</Button>
                  <Button onClick={() => void updateRecord({ ...selected, status: 'attention' })}>Flag attention</Button>
                  <Button onClick={() => void duplicate(selected)}>Duplicate</Button>
                  <Button onClick={() => void superAdminService.deleteDeployment(selected.id).then(load)}>Delete</Button>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-textMuted">Select a deployment to inspect rollout controls.</p>}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Owner guidance</p>
            <ul className="mt-4 space-y-2 text-sm text-textMuted">
              <li>Use <span className="text-white">Queued</span> for requests waiting on owner approval or tenant readiness.</li>
              <li>Use <span className="text-white">Deploying</span> once the rollout window opens.</li>
              <li>Move to <span className="text-white">Attention</span> when billing, data prep, or DNS blocks release.</li>
            </ul>
          </Card>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <Card className="w-full max-w-2xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{editing.id ? 'Deployment record' : 'New deployment'}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{editing.id ? 'Edit deployment' : 'Create deployment'}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tenant"><Input value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} /></Field>
              <Field label="Owner"><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
              <Field label="Environment"><Select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as DeploymentRecord['environment'] })} options={['production', 'staging', 'demo']} /></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DeploymentRecord['status'] })} options={['queued', 'deploying', 'ready', 'attention']} /></Field>
              <Field label="Scheduled for"><Input type="date" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} /></Field>
              <Field label="Note"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={() => void save()}>Save deployment</PrimaryButton></div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <Card><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p></Card>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm text-white">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm text-textMuted"><span>{label}</span>{children}</label>; }
