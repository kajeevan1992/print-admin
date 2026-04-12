
'use client';

import { useEffect, useMemo, useState } from 'react';
import { DatabaseBackup, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerBackupRecord, OwnerBackupScope, OwnerBackupStatus } from '@/data/owner-backups';
import { ownerBackupsService } from '@/services/owner-backups.service';

type StatusFilter = 'all' | OwnerBackupStatus;
type ScopeFilter = 'all' | OwnerBackupScope;

const emptyRecord: OwnerBackupRecord = {
  id: '',
  tenant: '',
  label: '',
  scope: 'tenant',
  status: 'healthy',
  frequency: '',
  lastRunAt: '',
  retention: '',
  owner: '',
  notes: ''
};

export function OwnerBackupsPage() {
  const [rows, setRows] = useState<OwnerBackupRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerBackupRecord | null>(null);

  async function load() {
    const data = await ownerBackupsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.label, row.frequency, row.retention, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerBackupRecord) {
    await ownerBackupsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Backups"
        subtitle="Manage tenant and platform backup policies before wiring real snapshot scheduling, storage, and recovery validation."
        actions={<><Button onClick={() => ownerBackupsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `backup-${Date.now()}` })}>New Backup Job</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-backups-search" name="ownerBackupsSearch" placeholder="Search tenant, label, frequency, owner, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-backups-status" name="ownerBackupsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'failed', label: 'Failed' }]} />
        <Select id="owner-backups-scope" name="ownerBackupsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'database', label: 'Database' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed backup jobs</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.label}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.scope} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.frequency} · {row.retention}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No backup jobs match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Backup spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Frequency" value={selected.frequency} />
                <MiniStat label="Last run" value={selected.lastRunAt} />
                <MiniStat label="Retention" value={selected.retention} />
                <MiniStat label="Owner" value={selected.owner} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'healthy' })}>Mark Healthy</Button>
                  <Button onClick={() => save({ ...selected, status: 'warning' })}>Mark Warning</Button>
                  <Button onClick={() => save({ ...selected, status: 'failed' })}>Mark Failed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Backup Job</Button>
                  <Button onClick={async () => { await ownerBackupsService.delete(selected.id); await load(); }}>Delete Backup Job</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a backup job to review retention and run details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model snapshot and retention controls before wiring real storage, restore testing, and backup compliance checks.</p>
              <p>This is the right future surface for restore verification, backup destinations, and recovery drill status.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerBackupRecord; onClose: () => void; onSave: (value: OwnerBackupRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerBackupRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner backup job' : 'New owner backup job'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-backup-tenant" name="ownerBackupTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-backup-label" name="ownerBackupLabel" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Backup label" />
          <Select id="owner-backup-scope" name="ownerBackupScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerBackupScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'database', label: 'Database' }]} />
          <Select id="owner-backup-status" name="ownerBackupStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerBackupStatus })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'failed', label: 'Failed' }]} />
          <Input id="owner-backup-frequency" name="ownerBackupFrequency" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="Frequency" />
          <Input id="owner-backup-last-run" name="ownerBackupLastRun" value={draft.lastRunAt} onChange={(e) => setDraft({ ...draft, lastRunAt: e.target.value })} placeholder="Last run at" />
          <Input id="owner-backup-retention" name="ownerBackupRetention" value={draft.retention} onChange={(e) => setDraft({ ...draft, retention: e.target.value })} placeholder="Retention" />
          <Input id="owner-backup-owner" name="ownerBackupOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-backup-notes"
            name="ownerBackupNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Backup Job</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
