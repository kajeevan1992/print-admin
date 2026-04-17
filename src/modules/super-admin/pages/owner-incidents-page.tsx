
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerIncidentRecord, OwnerIncidentSeverity, OwnerIncidentStatus } from '@/data/owner-incidents';
import { ownerIncidentsService } from '@/services/owner-incidents.service';

type StatusFilter = 'all' | OwnerIncidentStatus;
type SeverityFilter = 'all' | OwnerIncidentSeverity;

const emptyRecord: OwnerIncidentRecord = {
  id: '',
  tenant: '',
  title: '',
  severity: 'minor',
  status: 'open',
  startedAt: '',
  affectedArea: '',
  owner: '',
  summary: ''
};

export function OwnerIncidentsPage() {
  const [rows, setRows] = useState<OwnerIncidentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [editing, setEditing] = useState<OwnerIncidentRecord | null>(null);

  async function load() {
    const data = await ownerIncidentsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.affectedArea, row.owner, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesSeverity = severity === 'all' || row.severity === severity;
    return matchesQuery && matchesStatus && matchesSeverity;
  }), [rows, search, status, severity]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerIncidentRecord) {
    await ownerIncidentsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Incidents"
        subtitle="Track major tenant and platform incidents before wiring real alerting, timelines, postmortems, and customer status communication."
        actions={<><Button onClick={() => ownerIncidentsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `incident-${Date.now()}` })}>New Incident</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-incidents-search" name="ownerIncidentsSearch" placeholder="Search tenant, title, area, owner, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-incidents-status" name="ownerIncidentsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'mitigating', label: 'Mitigating' }, { value: 'resolved', label: 'Resolved' }]} />
        <Select id="owner-incidents-severity" name="ownerIncidentsSeverity" value={severity} onChange={(e) => setSeverity(e.target.value as SeverityFilter)} options={[{ value: 'all', label: 'All severity' }, { value: 'minor', label: 'Minor' }, { value: 'major', label: 'Major' }, { value: 'critical', label: 'Critical' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed incidents</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.title}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.affectedArea} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.severity} · {row.startedAt}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No incidents match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Incident spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Severity" value={selected.severity} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Started" value={selected.startedAt} />
                <MiniStat label="Affected area" value={selected.affectedArea} />
                <MiniStat label="Owner" value={selected.owner} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'open' })}>Mark Open</Button>
                  <Button onClick={() => save({ ...selected, status: 'mitigating' })}>Mark Mitigating</Button>
                  <Button onClick={() => save({ ...selected, status: 'resolved' })}>Mark Resolved</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Incident</Button>
                  <Button onClick={async () => { await ownerIncidentsService.delete(selected.id); await load(); }}>Delete Incident</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an incident to review impact and status.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model active incidents before wiring real paging, external status updates, and post-incident review flows.</p>
              <p>This is the right future surface for timelines, stakeholder comms, and linked remediation actions.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerIncidentRecord; onClose: () => void; onSave: (value: OwnerIncidentRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerIncidentRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner incident' : 'New owner incident'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-incident-tenant" name="ownerIncidentTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-incident-title" name="ownerIncidentTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-incident-severity" name="ownerIncidentSeverity" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as OwnerIncidentSeverity })} options={[{ value: 'minor', label: 'Minor' }, { value: 'major', label: 'Major' }, { value: 'critical', label: 'Critical' }]} />
          <Select id="owner-incident-status" name="ownerIncidentStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerIncidentStatus })} options={[{ value: 'open', label: 'Open' }, { value: 'mitigating', label: 'Mitigating' }, { value: 'resolved', label: 'Resolved' }]} />
          <Input id="owner-incident-started" name="ownerIncidentStarted" value={draft.startedAt} onChange={(e) => setDraft({ ...draft, startedAt: e.target.value })} placeholder="Started at" />
          <Input id="owner-incident-area" name="ownerIncidentArea" value={draft.affectedArea} onChange={(e) => setDraft({ ...draft, affectedArea: e.target.value })} placeholder="Affected area" />
          <Input id="owner-incident-owner" name="ownerIncidentOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-incident-summary"
            name="ownerIncidentSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Incident</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
