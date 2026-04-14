
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerSuccessPlanRecord, OwnerSuccessPlanScope, OwnerSuccessPlanStatus } from '@/data/owner-success-plans';
import { ownerSuccessPlansService } from '@/services/owner-success-plans.service';

type StatusFilter = 'all' | OwnerSuccessPlanStatus;
type ScopeFilter = 'all' | OwnerSuccessPlanScope;

const emptyRecord: OwnerSuccessPlanRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'adoption',
  status: 'draft',
  owner: '',
  targetDate: '',
  nextMilestone: '',
  summary: ''
};

export function OwnerSuccessPlansPage() {
  const [rows, setRows] = useState<OwnerSuccessPlanRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerSuccessPlanRecord | null>(null);

  async function load() {
    const data = await ownerSuccessPlansService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.nextMilestone, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerSuccessPlanRecord) {
    await ownerSuccessPlansService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Success Plans"
        subtitle="Track customer success plans before wiring real task orchestration, goals, and follow-up automation."
        actions={<><Button onClick={() => ownerSuccessPlansService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `success-${Date.now()}` })}>New Success Plan</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-success-search" name="ownerSuccessSearch" placeholder="Search tenant, title, owner, milestone, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-success-status" name="ownerSuccessStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
        <Select id="owner-success-scope" name="ownerSuccessScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'adoption', label: 'Adoption' }, { value: 'renewal', label: 'Renewal' }, { value: 'launch', label: 'Launch' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner success plans</div>
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
                <p className="text-sm text-textMuted">{row.targetDate} · {row.nextMilestone}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No success plans match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Success plan spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Target date" value={selected.targetDate} />
                <MiniStat label="Next milestone" value={selected.nextMilestone} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'draft' })}>Mark Draft</Button>
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'completed' })}>Mark Completed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Success Plan</Button>
                  <Button onClick={async () => { await ownerSuccessPlansService.delete(selected.id); await load(); }}>Delete Success Plan</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a success plan to review ownership and milestones.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model success plans before wiring tasks, milestones, and customer follow-up automation.</p>
              <p>This is the right future surface for measurable goals, stakeholder owners, and expansion actions.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerSuccessPlanRecord; onClose: () => void; onSave: (value: OwnerSuccessPlanRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerSuccessPlanRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner success plan' : 'New owner success plan'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-success-tenant" name="ownerSuccessTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-success-title" name="ownerSuccessTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-success-scope-edit" name="ownerSuccessScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerSuccessPlanScope })} options={[{ value: 'adoption', label: 'Adoption' }, { value: 'renewal', label: 'Renewal' }, { value: 'launch', label: 'Launch' }]} />
          <Select id="owner-success-status-edit" name="ownerSuccessStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerSuccessPlanStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
          <Input id="owner-success-owner" name="ownerSuccessOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-success-target-date" name="ownerSuccessTargetDate" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} placeholder="Target date" />
          <Input id="owner-success-milestone" name="ownerSuccessMilestone" value={draft.nextMilestone} onChange={(e) => setDraft({ ...draft, nextMilestone: e.target.value })} placeholder="Next milestone" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-success-summary"
            name="ownerSuccessSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Success Plan</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
