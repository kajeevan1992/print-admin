
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Rocket, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerOnboardingRecord, OwnerOnboardingStage, OwnerOnboardingStatus } from '@/data/owner-onboarding-pipeline';
import { ownerOnboardingPipelineService } from '@/services/owner-onboarding-pipeline.service';

type StatusFilter = 'all' | OwnerOnboardingStatus;
type StageFilter = 'all' | OwnerOnboardingStage;

const emptyRecord: OwnerOnboardingRecord = {
  id: '',
  tenant: '',
  stage: 'discovery',
  status: 'not-started',
  owner: '',
  targetGoLive: '',
  blocker: '',
  nextStep: '',
  summary: ''
};

export function OwnerOnboardingPipelinePage() {
  const [rows, setRows] = useState<OwnerOnboardingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stage, setStage] = useState<StageFilter>('all');
  const [editing, setEditing] = useState<OwnerOnboardingRecord | null>(null);

  async function load() {
    const data = await ownerOnboardingPipelineService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.owner, row.blocker, row.nextStep, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesStage = stage === 'all' || row.stage === stage;
    return matchesQuery && matchesStatus && matchesStage;
  }), [rows, search, status, stage]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerOnboardingRecord) {
    await ownerOnboardingPipelineService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Onboarding Pipeline"
        subtitle="Track customer onboarding progress before wiring task orchestration, docs, and handoff automation."
        actions={<><Button onClick={() => ownerOnboardingPipelineService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `onboarding-${Date.now()}` })}>New Onboarding Record</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-onboarding-search" name="ownerOnboardingSearch" placeholder="Search tenant, owner, blocker, next step, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-onboarding-status" name="ownerOnboardingStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'not-started', label: 'Not started' }, { value: 'in-progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }]} />
        <Select id="owner-onboarding-stage" name="ownerOnboardingStage" value={stage} onChange={(e) => setStage(e.target.value as StageFilter)} options={[{ value: 'all', label: 'All stages' }, { value: 'discovery', label: 'Discovery' }, { value: 'setup', label: 'Setup' }, { value: 'launch', label: 'Launch' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner onboarding records</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.stage} · {row.owner} · {row.targetGoLive}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.blocker} · {row.nextStep}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No onboarding records match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Onboarding spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Stage" value={selected.stage} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Target go-live" value={selected.targetGoLive} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Blocker" value={selected.blocker} />
                <MiniStat label="Next step" value={selected.nextStep} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'not-started' })}>Mark Not Started</Button>
                  <Button onClick={() => save({ ...selected, status: 'in-progress' })}>Mark In Progress</Button>
                  <Button onClick={() => save({ ...selected, status: 'completed' })}>Mark Completed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Onboarding Record</Button>
                  <Button onClick={async () => { await ownerOnboardingPipelineService.delete(selected.id); await load(); }}>Delete Onboarding Record</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an onboarding record to review progress and next step.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model onboarding progress before wiring tasks, document collection, and launch handoffs.</p>
              <p>This is the right future surface for dependencies, owner assignments, and milestone reporting.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerOnboardingRecord; onClose: () => void; onSave: (value: OwnerOnboardingRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerOnboardingRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner onboarding record' : 'New owner onboarding record'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-onboarding-tenant" name="ownerOnboardingTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-onboarding-stage-edit" name="ownerOnboardingStageEdit" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as OwnerOnboardingStage })} options={[{ value: 'discovery', label: 'Discovery' }, { value: 'setup', label: 'Setup' }, { value: 'launch', label: 'Launch' }]} />
          <Select id="owner-onboarding-status-edit" name="ownerOnboardingStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerOnboardingStatus })} options={[{ value: 'not-started', label: 'Not started' }, { value: 'in-progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }]} />
          <Input id="owner-onboarding-go-live" name="ownerOnboardingGoLive" value={draft.targetGoLive} onChange={(e) => setDraft({ ...draft, targetGoLive: e.target.value })} placeholder="Target go-live" />
          <Input id="owner-onboarding-owner" name="ownerOnboardingOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-onboarding-blocker" name="ownerOnboardingBlocker" value={draft.blocker} onChange={(e) => setDraft({ ...draft, blocker: e.target.value })} placeholder="Blocker" />
          <Input id="owner-onboarding-next-step" name="ownerOnboardingNextStep" value={draft.nextStep} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} placeholder="Next step" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-onboarding-summary"
            name="ownerOnboardingSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Onboarding Record</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
