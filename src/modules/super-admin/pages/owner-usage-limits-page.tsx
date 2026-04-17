
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gauge, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerUsageLimitRecord, OwnerUsageLimitScope, OwnerUsageLimitStatus } from '@/data/owner-usage-limits';
import { ownerUsageLimitsService } from '@/services/owner-usage-limits.service';

type StatusFilter = 'all' | OwnerUsageLimitStatus;
type ScopeFilter = 'all' | OwnerUsageLimitScope;

const emptyRecord: OwnerUsageLimitRecord = {
  id: '',
  tenant: '',
  scope: 'tenant',
  metric: '',
  planName: '',
  currentUsage: 0,
  limitValue: 0,
  status: 'healthy',
  owner: '',
  notes: ''
};

export function OwnerUsageLimitsPage() {
  const [rows, setRows] = useState<OwnerUsageLimitRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerUsageLimitRecord | null>(null);

  async function load() {
    const data = await ownerUsageLimitsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.metric, row.planName, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerUsageLimitRecord) {
    await ownerUsageLimitsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Usage Limits"
        subtitle="Manage SaaS plan limits, tenant overages, and feature caps before wiring real metering and billing enforcement."
        actions={<><Button onClick={() => ownerUsageLimitsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `limit-${Date.now()}` })}>New Limit</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-usage-limits-search" name="ownerUsageLimitsSearch" placeholder="Search tenant, metric, plan, owner, || notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-usage-limits-status" name="ownerUsageLimitsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'breached', label: 'Breached' }]} />
        <Select id="owner-usage-limits-scope" name="ownerUsageLimitsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'plan', label: 'Plan' }, { value: 'feature', label: 'Feature' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed usage controls</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.metric} · {row.planName} · {row.scope}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.currentUsage} / {row.limitValue}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No usage limits match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Limit spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Metric" value={selected.metric} />
                <MiniStat label="Plan" value={selected.planName} />
                <MiniStat label="Usage" value={`${selected.currentUsage} / ${selected.limitValue}`} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'healthy' })}>Mark Healthy</Button>
                  <Button onClick={() => save({ ...selected, status: 'warning' })}>Mark Warning</Button>
                  <Button onClick={() => save({ ...selected, status: 'breached' })}>Mark Breached</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Limit</Button>
                  <Button onClick={async () => { await ownerUsageLimitsService.delete(selected.id); await load(); }}>Delete Limit</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a usage limit to review plan control details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model overages, caps, and plan controls before wiring real metering, invoicing, and automated limit enforcement.</p>
              <p>This is the right future surface for plan upgrades, overage billing, alerting, and tenant entitlement checks.</p>
            </div>
          </Card>
        </div>
      </div>

      {editing && <EditModal value={editing} onClose={() => setEditing(null)} onSave={(next) => void save(next)} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
      <p className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function EditModal({ value, onClose, onSave }: { value: OwnerUsageLimitRecord; onClose: () => void; onSave: (value: OwnerUsageLimitRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerUsageLimitRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner usage limit' : 'New owner usage limit'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-limit-tenant" name="ownerLimitTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-limit-metric" name="ownerLimitMetric" value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} placeholder="Metric" />
          <Input id="owner-limit-plan" name="ownerLimitPlan" value={draft.planName} onChange={(e) => setDraft({ ...draft, planName: e.target.value })} placeholder="Plan name" />
          <Select id="owner-limit-scope" name="ownerLimitScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerUsageLimitScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'plan', label: 'Plan' }, { value: 'feature', label: 'Feature' }]} />
          <Select id="owner-limit-status" name="ownerLimitStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerUsageLimitStatus })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'breached', label: 'Breached' }]} />
          <Input id="owner-limit-current" name="ownerLimitCurrent" type="number" value={String(draft.currentUsage)} onChange={(e) => setDraft({ ...draft, currentUsage: Number(e.target.value) || 0 })} placeholder="Current usage" />
          <Input id="owner-limit-max" name="ownerLimitMax" type="number" value={String(draft.limitValue)} onChange={(e) => setDraft({ ...draft, limitValue: Number(e.target.value) || 0 })} placeholder="Limit value" />
          <Input id="owner-limit-owner" name="ownerLimitOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-limit-notes"
            name="ownerLimitNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Limit</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
