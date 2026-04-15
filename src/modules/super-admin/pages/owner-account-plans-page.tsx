
'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerAccountPlanRecord, OwnerAccountPlanScope, OwnerAccountPlanStatus } from '@/data/owner-account-plans';
import { ownerAccountPlansService } from '@/services/owner-account-plans.service';

type StatusFilter = 'all' | OwnerAccountPlanStatus;
type ScopeFilter = 'all' | OwnerAccountPlanScope;

const emptyRecord: OwnerAccountPlanRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'growth',
  status: 'draft',
  owner: '',
  targetDate: '',
  keyOutcome: '',
  summary: ''
};

export function OwnerAccountPlansPage() {
  const [rows, setRows] = useState<OwnerAccountPlanRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerAccountPlanRecord | null>(null);

  async function load() {
    const data = await ownerAccountPlansService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.keyOutcome, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerAccountPlanRecord) {
    await ownerAccountPlansService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Account Plans"
        subtitle="Track account-level plans before wiring real playbooks, milestones, and stakeholder follow-up automation."
        actions={<><Button onClick={() => ownerAccountPlansService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `account-plan-${Date.now()}` })}>New Account Plan</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-account-plans-search" name="ownerAccountPlansSearch" placeholder="Search tenant, title, owner, outcome, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-account-plans-status" name="ownerAccountPlansStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
        <Select id="owner-account-plans-scope" name="ownerAccountPlansScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'growth', label: 'Growth' }, { value: 'retention', label: 'Retention' }, { value: 'launch', label: 'Launch' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner account plans</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.title}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.scope} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.targetDate} · {row.keyOutcome}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No account plans match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Account plan spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Target date" value={selected.targetDate} />
                <MiniStat label="Key outcome" value={selected.keyOutcome} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'draft' })}>Mark Draft</Button>
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'completed' })}>Mark Completed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Account Plan</Button>
                  <Button onClick={async () => { await ownerAccountPlansService.delete(selected.id); await load(); }}>Delete Account Plan</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an account plan to review ownership and outcomes.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model account planning before wiring real tasks, milestones, and stakeholder alignment.</p>
              <p>This is the right future surface for account strategy, follow-up ownership, and commercial planning.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerAccountPlanRecord; onClose: () => void; onSave: (value: OwnerAccountPlanRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerAccountPlanRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner account plan' : 'New owner account plan'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-account-plan-tenant" name="ownerAccountPlanTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-account-plan-title" name="ownerAccountPlanTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-account-plan-scope-edit" name="ownerAccountPlanScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerAccountPlanScope })} options={[{ value: 'growth', label: 'Growth' }, { value: 'retention', label: 'Retention' }, { value: 'launch', label: 'Launch' }]} />
          <Select id="owner-account-plan-status-edit" name="ownerAccountPlanStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerAccountPlanStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
          <Input id="owner-account-plan-owner" name="ownerAccountPlanOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-account-plan-target-date" name="ownerAccountPlanTargetDate" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} placeholder="Target date" />
          <Input id="owner-account-plan-outcome" name="ownerAccountPlanOutcome" value={draft.keyOutcome} onChange={(e) => setDraft({ ...draft, keyOutcome: e.target.value })} placeholder="Key outcome" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-account-plan-summary"
            name="ownerAccountPlanSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Account Plan</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
