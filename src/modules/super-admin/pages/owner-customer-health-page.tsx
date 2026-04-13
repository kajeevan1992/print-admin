
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerCustomerHealthRecord, OwnerCustomerHealthScope, OwnerCustomerHealthStatus } from '@/data/owner-customer-health';
import { ownerCustomerHealthService } from '@/services/owner-customer-health.service';

type StatusFilter = 'all' | OwnerCustomerHealthStatus;
type ScopeFilter = 'all' | OwnerCustomerHealthScope;

const emptyRecord: OwnerCustomerHealthRecord = {
  id: '',
  tenant: '',
  scope: 'adoption',
  status: 'healthy',
  score: 75,
  primaryRisk: '',
  lastTouchpoint: '',
  owner: '',
  summary: ''
};

export function OwnerCustomerHealthPage() {
  const [rows, setRows] = useState<OwnerCustomerHealthRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerCustomerHealthRecord | null>(null);

  async function load() {
    const data = await ownerCustomerHealthService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.primaryRisk, row.owner, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerCustomerHealthRecord) {
    await ownerCustomerHealthService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Customer Health"
        subtitle="Track customer risk and adoption signals before wiring real success metrics, renewals, and intervention workflows."
        actions={<><Button onClick={() => ownerCustomerHealthService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `health-${Date.now()}` })}>New Health Record</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-health-search" name="ownerHealthSearch" placeholder="Search tenant, risk, owner, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-health-status" name="ownerHealthStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'at-risk', label: 'At risk' }]} />
        <Select id="owner-health-scope" name="ownerHealthScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'adoption', label: 'Adoption' }, { value: 'billing', label: 'Billing' }, { value: 'operations', label: 'Operations' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner customer-health records</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.scope} · {row.owner} · score {row.score}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.primaryRisk} · {row.lastTouchpoint}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No customer-health records match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Health spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Score" value={String(selected.score)} />
                <MiniStat label="Primary risk" value={selected.primaryRisk} />
                <MiniStat label="Last touchpoint" value={selected.lastTouchpoint} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'healthy' })}>Mark Healthy</Button>
                  <Button onClick={() => save({ ...selected, status: 'watch' })}>Mark Watch</Button>
                  <Button onClick={() => save({ ...selected, status: 'at-risk' })}>Mark At Risk</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Health Record</Button>
                  <Button onClick={async () => { await ownerCustomerHealthService.delete(selected.id); await load(); }}>Delete Health Record</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a health record to review risk and ownership.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model customer-success health before wiring real telemetry, renewal workflows, and intervention tasks.</p>
              <p>This is the right future surface for churn risk, expansion signals, and linked action plans.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerCustomerHealthRecord; onClose: () => void; onSave: (value: OwnerCustomerHealthRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerCustomerHealthRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner health record' : 'New owner health record'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-health-tenant" name="ownerHealthTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-health-scope-edit" name="ownerHealthScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerCustomerHealthScope })} options={[{ value: 'adoption', label: 'Adoption' }, { value: 'billing', label: 'Billing' }, { value: 'operations', label: 'Operations' }]} />
          <Select id="owner-health-status-edit" name="ownerHealthStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerCustomerHealthStatus })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'at-risk', label: 'At risk' }]} />
          <Input id="owner-health-score" name="ownerHealthScore" type="number" value={String(draft.score)} onChange={(e) => setDraft({ ...draft, score: Number(e.target.value) || 0 })} placeholder="Score" />
          <Input id="owner-health-risk" name="ownerHealthRisk" value={draft.primaryRisk} onChange={(e) => setDraft({ ...draft, primaryRisk: e.target.value })} placeholder="Primary risk" />
          <Input id="owner-health-touchpoint" name="ownerHealthTouchpoint" value={draft.lastTouchpoint} onChange={(e) => setDraft({ ...draft, lastTouchpoint: e.target.value })} placeholder="Last touchpoint" />
          <Input id="owner-health-owner" name="ownerHealthOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-health-summary"
            name="ownerHealthSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Health Record</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
