'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, CreditCard, Rocket, Search, Shield, UploadCloud, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { BaseModal } from '@/components/modals/base-modal';
import { Select } from '@/components/forms/select';
import { superAdminService } from '@/services/super-admin.service';
import type { DemoUploadRecord, DeploymentRecord, TenantAccount, TenantHealth, TenantStatus } from '@/data/super-admin';

const statusOptions: Array<'all' | TenantStatus> = ['all', 'active', 'trial', 'past_due', 'setup'];
const healthTone: Record<TenantHealth, string> = {
  healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
};

const statusTone: Record<TenantStatus, string> = {
  active: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  trial: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  setup: 'border-slate-400/25 bg-slate-400/10 text-slate-200',
  past_due: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
};

const emptyTenant: TenantAccount = {
  id: '',
  company: '',
  primaryContact: '',
  segment: 'Starter',
  status: 'trial',
  health: 'healthy',
  seatsUsed: 0,
  seatLimit: 5,
  activeStores: 1,
  monthlyRecurringRevenue: 0,
  nextInvoiceAt: '2026-04-30',
  deploymentState: 'queued',
  activationState: 'demo'
};

function currency(value: number) {
  return `£${value.toLocaleString()}`;
}

export function SuperAdminPage() {
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [demos, setDemos] = useState<DemoUploadRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TenantStatus>('all');
  const [editing, setEditing] = useState<TenantAccount | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const [tenantRows, deploymentRows, demoRows] = await Promise.all([
      superAdminService.listTenants(),
      superAdminService.listDeployments(),
      superAdminService.listDemoUploads()
    ]);
    setTenants(tenantRows);
    setDeployments(deploymentRows);
    setDemos(demoRows);
    setSelectedId((current) => current ?? tenantRows[0]?.id ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => tenants.filter((tenant) => {
    const haystack = `${tenant.company} ${tenant.primaryContact} ${tenant.segment} ${tenant.activationState}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = status === 'all' || tenant.status === status;
    return matchesSearch && matchesStatus;
  }), [tenants, search, status]);

  const selected = rows.find((tenant) => tenant.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    mrr: rows.reduce((sum, item) => sum + item.monthlyRecurringRevenue, 0),
    liveStores: rows.reduce((sum, item) => sum + item.activeStores, 0),
    atRisk: rows.filter((item) => item.health !== 'healthy' || item.status === 'past_due').length,
    queuedDeployments: deployments.filter((item) => item.status !== 'ready').length
  }), [deployments, rows]);

  async function saveTenant(record: TenantAccount) {
    await superAdminService.saveTenant(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  async function nudgeBilling(record: TenantAccount) {
    await superAdminService.saveTenant({
      ...record,
      status: record.status === 'past_due' ? 'active' : 'past_due',
      health: record.status === 'past_due' ? 'healthy' : 'critical'
    });
    await load();
  }

  async function increaseSeats(record: TenantAccount) {
    await superAdminService.saveTenant({ ...record, seatLimit: record.seatLimit + 5 });
    await load();
  }

  async function queueDeployment(record: TenantAccount) {
    await superAdminService.saveDeployment({
      id: `dep-${Date.now()}`,
      tenant: record.company,
      environment: 'production',
      status: 'queued',
      owner: 'Owner Ops',
      scheduledFor: '2026-04-18',
      note: 'Queued from super admin control surface.'
    });
    await load();
  }

  async function uploadDemo(record: TenantAccount) {
    await superAdminService.saveDemoUpload({
      id: `demo-${Date.now()}`,
      tenant: record.company,
      assetPack: `${record.company} demo starter pack`,
      status: 'uploaded',
      uploadedBy: 'Owner Ops',
      updatedAt: '2026-04-11'
    });
    await load();
  }

  async function resetAll() {
    await Promise.all([
      superAdminService.resetTenants(),
      superAdminService.resetDeployments(),
      superAdminService.resetDemoUploads()
    ]);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Super Admin"
        subtitle="Control your SaaS estate: tenants, licence limits, payments, deployments, store activations, and demo uploads."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={resetAll}>Reset seed data</Button><PrimaryButton onClick={() => setEditing({ ...emptyTenant, id: `tenant-${Date.now()}` })}>Add customer account</PrimaryButton></div>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard icon={CreditCard} label="MRR" value={currency(kpis.mrr)} helper="Monthly recurring revenue tracked locally." />
        <MetricCard icon={Boxes} label="Live stores" value={String(kpis.liveStores)} helper="Across all active tenant accounts." />
        <MetricCard icon={Shield} label="At risk" value={String(kpis.atRisk)} helper="Billing, health, or deployment attention." />
        <MetricCard icon={Rocket} label="Queued deploys" value={String(kpis.queuedDeployments)} helper="Owner-led rollout queue." />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer account, contact, or activation..." />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | TenantStatus)} options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : item.replace('_', ' ') }))} />
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setSelectedId(tenant.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === tenant.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{tenant.segment}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${statusTone[tenant.status]}`}>{tenant.status.replace('_', ' ')}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${healthTone[tenant.health]}`}>{tenant.health}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{tenant.company}</h3>
                    <p className="mt-1 text-sm text-textMuted">{tenant.primaryContact} · {tenant.activeStores} stores · {tenant.seatsUsed}/{tenant.seatLimit} seats</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-textMuted">MRR</p>
                    <p className="mt-2 text-xl font-semibold text-white">{currency(tenant.monthlyRecurringRevenue)}</p>
                    <p className="mt-2 text-xs text-textMuted">Invoice {tenant.nextInvoiceAt}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Customer spotlight</p>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.company}</h2>
                  <p className="mt-2 text-sm text-textMuted">{selected.primaryContact} · {selected.segment} plan · activation {selected.activationState}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Deployment" value={selected.deploymentState} />
                  <Info label="Stores" value={String(selected.activeStores)} />
                  <Info label="Seat limit" value={`${selected.seatsUsed}/${selected.seatLimit}`} />
                  <Info label="Next invoice" value={selected.nextInvoiceAt} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setEditing(selected)}>Edit account</Button>
                  <Button onClick={() => increaseSeats(selected)}>Increase seats</Button>
                  <Button onClick={() => nudgeBilling(selected)}>{selected.status === 'past_due' ? 'Clear payment risk' : 'Flag payment risk'}</Button>
                  <Button onClick={() => queueDeployment(selected)}>Queue deployment</Button>
                  <PrimaryButton onClick={() => uploadDemo(selected)}>Upload demo pack</PrimaryButton>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-textMuted">Select a tenant account to inspect commercial and rollout controls.</p>
            )}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Deployments</p>
            <div className="mt-4 space-y-3">
              {deployments.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.tenant}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.environment} · {item.owner} · {item.scheduledFor}</p>
                    </div>
                    <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-textMuted">{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-textMuted">{item.note}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Demo uploads</p>
            <div className="mt-4 space-y-3">
              {demos.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.assetPack}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.tenant} · {item.uploadedBy}</p>
                    </div>
                    <UploadCloud size={16} className="text-cyan-200" />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-textMuted">{item.status} · updated {item.updatedAt}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={Boolean(editing)} title={editing?.id?.startsWith('tenant-') ? 'Tenant account' : 'Tenant account'} onClose={() => setEditing(null)}>
        {editing ? <TenantEditor value={editing} onChange={setEditing} onSave={() => saveTenant(editing)} /> : null}
      </BaseModal>
    </div>
  );
}

function TenantEditor({
  value,
  onChange,
  onSave
}: {
  value: TenantAccount;
  onChange: (next: TenantAccount) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Company"><Input value={value.company} onChange={(event) => onChange({ ...value, company: event.target.value })} /></Field>
      <Field label="Primary contact"><Input value={value.primaryContact} onChange={(event) => onChange({ ...value, primaryContact: event.target.value })} /></Field>
      <Field label="Segment"><Select value={value.segment} onChange={(event) => onChange({ ...value, segment: event.target.value as TenantAccount['segment'] })} options={['Starter', 'Growth', 'Enterprise']} /></Field>
      <Field label="Status"><Select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as TenantStatus })} options={['active', 'trial', 'past_due', 'setup']} /></Field>
      <Field label="Seats used"><Input type="number" value={String(value.seatsUsed)} onChange={(event) => onChange({ ...value, seatsUsed: Number(event.target.value) || 0 })} /></Field>
      <Field label="Seat limit"><Input type="number" value={String(value.seatLimit)} onChange={(event) => onChange({ ...value, seatLimit: Number(event.target.value) || 0 })} /></Field>
      <Field label="Active stores"><Input type="number" value={String(value.activeStores)} onChange={(event) => onChange({ ...value, activeStores: Number(event.target.value) || 0 })} /></Field>
      <Field label="MRR"><Input type="number" value={String(value.monthlyRecurringRevenue)} onChange={(event) => onChange({ ...value, monthlyRecurringRevenue: Number(event.target.value) || 0 })} /></Field>
      <Field label="Deployment state"><Select value={value.deploymentState} onChange={(event) => onChange({ ...value, deploymentState: event.target.value as TenantAccount['deploymentState'] })} options={['stable', 'queued', 'attention']} /></Field>
      <Field label="Activation state"><Select value={value.activationState} onChange={(event) => onChange({ ...value, activationState: event.target.value as TenantAccount['activationState'] })} options={['live', 'pending', 'demo']} /></Field>
      <div className="md:col-span-2 flex justify-end"><PrimaryButton onClick={onSave}>Save customer account</PrimaryButton></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-textMuted">{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
          <p className="mt-2 text-sm text-textMuted">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-cyan-200">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
