
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerMaintenanceRecord, OwnerMaintenanceScope, OwnerMaintenanceStatus } from '@/data/owner-maintenance-windows';
import { ownerMaintenanceWindowsService } from '@/services/owner-maintenance-windows.service';

type StatusFilter = 'all' | OwnerMaintenanceStatus;
type ScopeFilter = 'all' | OwnerMaintenanceScope;

const emptyRecord: OwnerMaintenanceRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'tenant',
  status: 'scheduled',
  startAt: '',
  endAt: '',
  impact: '',
  owner: '',
  notes: ''
};

export function OwnerMaintenanceWindowsPage() {
  const [rows, setRows] = useState<OwnerMaintenanceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerMaintenanceRecord | null>(null);

  async function load() {
    const data = await ownerMaintenanceWindowsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.impact, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerMaintenanceRecord) {
    await ownerMaintenanceWindowsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Maintenance Windows"
        subtitle="Manage scheduled maintenance and tenant impact windows before wiring real deployment locks, status pages, and notification delivery."
        actions={<><Button onClick={() => ownerMaintenanceWindowsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `mw-${Date.now()}` })}>New Maintenance Window</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-maintenance-search" name="ownerMaintenanceSearch" placeholder="Search tenant, title, impact, owner, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-maintenance-status" name="ownerMaintenanceStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
        <Select id="owner-maintenance-scope" name="ownerMaintenanceScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'environment', label: 'Environment' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed maintenance windows</div>
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
                <p className="text-sm text-textMuted">{row.startAt} → {row.endAt}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No maintenance windows match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Maintenance spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Start" value={selected.startAt} />
                <MiniStat label="End" value={selected.endAt} />
                <MiniStat label="Impact" value={selected.impact} />
                <MiniStat label="Owner" value={selected.owner} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'scheduled' })}>Mark Scheduled</Button>
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'completed' })}>Mark Completed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Maintenance Window</Button>
                  <Button onClick={async () => { await ownerMaintenanceWindowsService.delete(selected.id); await load(); }}>Delete Maintenance Window</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a maintenance window to review timing and impact.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model outage windows and planned maintenance before wiring real status-page sync, release locking, and alert delivery.</p>
              <p>This is the right future surface for blackout windows, maintenance approvals, and tenant communication history.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerMaintenanceRecord; onClose: () => void; onSave: (value: OwnerMaintenanceRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerMaintenanceRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner maintenance window' : 'New owner maintenance window'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-mw-tenant" name="ownerMwTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-mw-title" name="ownerMwTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-mw-scope" name="ownerMwScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerMaintenanceScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'environment', label: 'Environment' }]} />
          <Select id="owner-mw-status" name="ownerMwStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerMaintenanceStatus })} options={[{ value: 'scheduled', label: 'Scheduled' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
          <Input id="owner-mw-start" name="ownerMwStart" value={draft.startAt} onChange={(e) => setDraft({ ...draft, startAt: e.target.value })} placeholder="Start at" />
          <Input id="owner-mw-end" name="ownerMwEnd" value={draft.endAt} onChange={(e) => setDraft({ ...draft, endAt: e.target.value })} placeholder="End at" />
          <Input id="owner-mw-impact" name="ownerMwImpact" value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })} placeholder="Impact" />
          <Input id="owner-mw-owner" name="ownerMwOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-mw-notes"
            name="ownerMwNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Maintenance Window</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
