
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerRenewalRecord, OwnerRenewalScope, OwnerRenewalStatus } from '@/data/owner-renewals';
import { ownerRenewalsService } from '@/services/owner-renewals.service';

type StatusFilter = 'all' | OwnerRenewalStatus;
type ScopeFilter = 'all' | OwnerRenewalScope;

const emptyRecord: OwnerRenewalRecord = {
  id: '',
  tenant: '',
  scope: 'tenant',
  status: 'on-track',
  renewalDate: '',
  contractValue: '',
  owner: '',
  nextAction: '',
  summary: ''
};

export function OwnerRenewalsPage() {
  const [rows, setRows] = useState<OwnerRenewalRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerRenewalRecord | null>(null);

  async function load() {
    const data = await ownerRenewalsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.contractValue, row.owner, row.nextAction, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerRenewalRecord) {
    await ownerRenewalsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Renewals"
        subtitle="Track owner-side renewal momentum before wiring real CRM sync, commercial approvals, and intervention workflows."
        actions={<><Button onClick={() => ownerRenewalsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `renewal-${Date.now()}` })}>New Renewal</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-renewals-search" name="ownerRenewalsSearch" placeholder="Search tenant, value, owner, action, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-renewals-status" name="ownerRenewalsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'on-track', label: 'On track' }, { value: 'at-risk', label: 'At risk' }, { value: 'renewed', label: 'Renewed' }]} />
        <Select id="owner-renewals-scope" name="ownerRenewalsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'plan', label: 'Plan' }, { value: 'contract', label: 'Contract' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner renewal records</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.scope} · {row.owner} · {row.contractValue}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.renewalDate} · {row.nextAction}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No renewal records match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Renewal spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Renewal date" value={selected.renewalDate} />
                <MiniStat label="Contract value" value={selected.contractValue} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Next action" value={selected.nextAction} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'on-track' })}>Mark On Track</Button>
                  <Button onClick={() => save({ ...selected, status: 'at-risk' })}>Mark At Risk</Button>
                  <Button onClick={() => save({ ...selected, status: 'renewed' })}>Mark Renewed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Renewal</Button>
                  <Button onClick={async () => { await ownerRenewalsService.delete(selected.id); await load(); }}>Delete Renewal</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a renewal record to review momentum and next steps.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model renewal tracking before wiring real CRM updates, quote approvals, and retention playbooks.</p>
              <p>This is the right future surface for renewal forecasting, expansion risk, and linked commercial actions.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerRenewalRecord; onClose: () => void; onSave: (value: OwnerRenewalRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerRenewalRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner renewal' : 'New owner renewal'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-renewal-tenant" name="ownerRenewalTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-renewal-scope-edit" name="ownerRenewalScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerRenewalScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'plan', label: 'Plan' }, { value: 'contract', label: 'Contract' }]} />
          <Select id="owner-renewal-status-edit" name="ownerRenewalStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerRenewalStatus })} options={[{ value: 'on-track', label: 'On track' }, { value: 'at-risk', label: 'At risk' }, { value: 'renewed', label: 'Renewed' }]} />
          <Input id="owner-renewal-date" name="ownerRenewalDate" value={draft.renewalDate} onChange={(e) => setDraft({ ...draft, renewalDate: e.target.value })} placeholder="Renewal date" />
          <Input id="owner-renewal-value" name="ownerRenewalValue" value={draft.contractValue} onChange={(e) => setDraft({ ...draft, contractValue: e.target.value })} placeholder="Contract value" />
          <Input id="owner-renewal-owner" name="ownerRenewalOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-renewal-action" name="ownerRenewalAction" value={draft.nextAction} onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })} placeholder="Next action" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-renewal-summary"
            name="ownerRenewalSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Renewal</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
