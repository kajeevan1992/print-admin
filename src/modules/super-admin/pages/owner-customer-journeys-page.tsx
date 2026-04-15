
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerCustomerJourneyRecord, OwnerCustomerJourneyStage, OwnerCustomerJourneyStatus } from '@/data/owner-customer-journeys';
import { ownerCustomerJourneysService } from '@/services/owner-customer-journeys.service';

type StatusFilter = 'all' | OwnerCustomerJourneyStatus;
type StageFilter = 'all' | OwnerCustomerJourneyStage;

const emptyRecord: OwnerCustomerJourneyRecord = {
  id: '',
  tenant: '',
  stage: 'onboarding',
  status: 'mapped',
  owner: '',
  priorityTouchpoint: '',
  nextReviewDate: '',
  goal: '',
  summary: ''
};

export function OwnerCustomerJourneysPage() {
  const [rows, setRows] = useState<OwnerCustomerJourneyRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stage, setStage] = useState<StageFilter>('all');
  const [editing, setEditing] = useState<OwnerCustomerJourneyRecord | null>(null);

  async function load() {
    const data = await ownerCustomerJourneysService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.owner, row.priorityTouchpoint, row.goal, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesStage = stage === 'all' || row.stage === stage;
    return matchesQuery && matchesStatus && matchesStage;
  }), [rows, search, status, stage]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerCustomerJourneyRecord) {
    await ownerCustomerJourneysService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Customer Journeys"
        subtitle="Track customer journey plans before wiring lifecycle automation, milestones, and customer-success follow-ups."
        actions={<><Button onClick={() => ownerCustomerJourneysService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `journey-${Date.now()}` })}>New Journey</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-journeys-search" name="ownerJourneysSearch" placeholder="Search tenant, owner, touchpoint, goal, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-journeys-status" name="ownerJourneysStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'mapped', label: 'Mapped' }, { value: 'in-progress', label: 'In progress' }, { value: 'complete', label: 'Complete' }]} />
        <Select id="owner-journeys-stage" name="ownerJourneysStage" value={stage} onChange={(e) => setStage(e.target.value as StageFilter)} options={[{ value: 'all', label: 'All stages' }, { value: 'onboarding', label: 'Onboarding' }, { value: 'adoption', label: 'Adoption' }, { value: 'expansion', label: 'Expansion' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner customer journeys</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.stage} · {row.owner} · {row.goal}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.priorityTouchpoint} · {row.nextReviewDate}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No customer journeys match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Journey spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Stage" value={selected.stage} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Goal" value={selected.goal} />
                <MiniStat label="Touchpoint" value={selected.priorityTouchpoint} />
                <MiniStat label="Next review" value={selected.nextReviewDate} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'mapped' })}>Mark Mapped</Button>
                  <Button onClick={() => save({ ...selected, status: 'in-progress' })}>Mark In Progress</Button>
                  <Button onClick={() => save({ ...selected, status: 'complete' })}>Mark Complete</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Journey</Button>
                  <Button onClick={async () => { await ownerCustomerJourneysService.delete(selected.id); await load(); }}>Delete Journey</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a journey to review lifecycle planning and milestones.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model lifecycle journeys before wiring automation, milestones, and review cadences.</p>
              <p>This is the right future surface for journey mapping, customer touchpoints, and success transitions.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerCustomerJourneyRecord; onClose: () => void; onSave: (value: OwnerCustomerJourneyRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerCustomerJourneyRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner customer journey' : 'New owner customer journey'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-journey-tenant" name="ownerJourneyTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-journey-stage-edit" name="ownerJourneyStageEdit" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as OwnerCustomerJourneyStage })} options={[{ value: 'onboarding', label: 'Onboarding' }, { value: 'adoption', label: 'Adoption' }, { value: 'expansion', label: 'Expansion' }]} />
          <Select id="owner-journey-status-edit" name="ownerJourneyStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerCustomerJourneyStatus })} options={[{ value: 'mapped', label: 'Mapped' }, { value: 'in-progress', label: 'In progress' }, { value: 'complete', label: 'Complete' }]} />
          <Input id="owner-journey-owner" name="ownerJourneyOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-journey-touchpoint" name="ownerJourneyTouchpoint" value={draft.priorityTouchpoint} onChange={(e) => setDraft({ ...draft, priorityTouchpoint: e.target.value })} placeholder="Priority touchpoint" />
          <Input id="owner-journey-review-date" name="ownerJourneyReviewDate" value={draft.nextReviewDate} onChange={(e) => setDraft({ ...draft, nextReviewDate: e.target.value })} placeholder="Next review date" />
          <Input id="owner-journey-goal" name="ownerJourneyGoal" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="Goal" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-journey-summary"
            name="ownerJourneySummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Journey</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
