
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Presentation, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerQbrRecord, OwnerQbrScope, OwnerQbrStatus } from '@/data/owner-qbrs';
import { ownerQbrsService } from '@/services/owner-qbrs.service';

type StatusFilter = 'all' | OwnerQbrStatus;
type ScopeFilter = 'all' | OwnerQbrScope;

const emptyRecord: OwnerQbrRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'tenant',
  status: 'planned',
  meetingDate: '',
  owner: '',
  agenda: '',
  summary: ''
};

export function OwnerQbrsPage() {
  const [rows, setRows] = useState<OwnerQbrRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerQbrRecord | null>(null);

  async function load() {
    const data = await ownerQbrsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.agenda, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerQbrRecord) {
    await ownerQbrsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner QBRs"
        subtitle="Track quarterly reviews and executive business check-ins before wiring decks, notes, and CRM-linked follow-up actions."
        actions={<><Button onClick={() => ownerQbrsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `qbr-${Date.now()}` })}>New QBR</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-qbrs-search" name="ownerQbrsSearch" placeholder="Search tenant, title, owner, agenda, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-qbrs-status" name="ownerQbrsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'planned', label: 'Planned' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }]} />
        <Select id="owner-qbrs-scope" name="ownerQbrsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner QBR records</div>
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
                <p className="text-sm text-textMuted">{row.meetingDate} · {row.agenda}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No QBR records match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Presentation className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">QBR spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Meeting date" value={selected.meetingDate} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Agenda" value={selected.agenda} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'planned' })}>Mark Planned</Button>
                  <Button onClick={() => save({ ...selected, status: 'scheduled' })}>Mark Scheduled</Button>
                  <Button onClick={() => save({ ...selected, status: 'completed' })}>Mark Completed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit QBR</Button>
                  <Button onClick={async () => { await ownerQbrsService.delete(selected.id); await load(); }}>Delete QBR</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a QBR to review cadence and agenda.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model business-review workflows before wiring decks, meeting notes, and CRM-linked follow-up.</p>
              <p>This is the right future surface for review outcomes, action owners, and executive summaries.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerQbrRecord; onClose: () => void; onSave: (value: OwnerQbrRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerQbrRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner QBR' : 'New owner QBR'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-qbr-tenant" name="ownerQbrTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-qbr-title" name="ownerQbrTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-qbr-scope-edit" name="ownerQbrScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerQbrScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
          <Select id="owner-qbr-status-edit" name="ownerQbrStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerQbrStatus })} options={[{ value: 'planned', label: 'Planned' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }]} />
          <Input id="owner-qbr-date" name="ownerQbrDate" value={draft.meetingDate} onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })} placeholder="Meeting date" />
          <Input id="owner-qbr-owner" name="ownerQbrOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-qbr-agenda" name="ownerQbrAgenda" value={draft.agenda} onChange={(e) => setDraft({ ...draft, agenda: e.target.value })} placeholder="Agenda" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-qbr-summary"
            name="ownerQbrSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save QBR</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
