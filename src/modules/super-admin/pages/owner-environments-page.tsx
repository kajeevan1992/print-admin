
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerEnvironmentRecord, OwnerEnvironmentStatus, OwnerEnvironmentType } from '@/data/owner-environments';
import { ownerEnvironmentsService } from '@/services/owner-environments.service';

type StatusFilter = 'all' | OwnerEnvironmentStatus;
type TypeFilter = 'all' | OwnerEnvironmentType;

const emptyRecord: OwnerEnvironmentRecord = {
  id: '',
  tenant: '',
  name: '',
  type: 'production',
  status: 'healthy',
  region: '',
  releaseChannel: '',
  owner: '',
  notes: ''
};

export function OwnerEnvironmentsPage() {
  const [rows, setRows] = useState<OwnerEnvironmentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<OwnerEnvironmentRecord | null>(null);

  async function load() {
    const data = await ownerEnvironmentsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.name, row.region, row.releaseChannel, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesType = type === 'all' || row.type === type;
    return matchesQuery && matchesStatus && matchesType;
  }), [rows, search, status, type]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerEnvironmentRecord) {
    await ownerEnvironmentsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Environments"
        subtitle="Manage tenant environments, release channels, and deployment regions before wiring real infra controls and health checks."
        actions={<><Button onClick={() => ownerEnvironmentsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `env-${Date.now()}` })}>New Environment</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-environments-search" name="ownerEnvironmentsSearch" placeholder="Search tenant, env, region, channel, owner, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-environments-status" name="ownerEnvironmentsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'maintenance', label: 'Maintenance' }]} />
        <Select id="owner-environments-type" name="ownerEnvironmentsType" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} options={[{ value: 'all', label: 'All types' }, { value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'demo', label: 'Demo' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed environments</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.name}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.type} · {row.region}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.releaseChannel}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No environments match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Environment spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Type" value={selected.type} />
                <MiniStat label="Region" value={selected.region} />
                <MiniStat label="Release channel" value={selected.releaseChannel} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'healthy' })}>Mark Healthy</Button>
                  <Button onClick={() => save({ ...selected, status: 'warning' })}>Mark Warning</Button>
                  <Button onClick={() => save({ ...selected, status: 'maintenance' })}>Set Maintenance</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Environment</Button>
                  <Button onClick={async () => { await ownerEnvironmentsService.delete(selected.id); await load(); }}>Delete Environment</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an environment to review deployment details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model tenant environment controls before wiring real infrastructure health, deployment locks, and region placement.</p>
              <p>This is the right future surface for environment promotions, maintenance windows, and deployment approvals.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerEnvironmentRecord; onClose: () => void; onSave: (value: OwnerEnvironmentRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerEnvironmentRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner environment' : 'New owner environment'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-env-tenant" name="ownerEnvTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-env-name" name="ownerEnvName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Environment name" />
          <Select id="owner-env-type" name="ownerEnvType" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as OwnerEnvironmentType })} options={[{ value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'demo', label: 'Demo' }]} />
          <Select id="owner-env-status" name="ownerEnvStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerEnvironmentStatus })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'warning', label: 'Warning' }, { value: 'maintenance', label: 'Maintenance' }]} />
          <Input id="owner-env-region" name="ownerEnvRegion" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} placeholder="Region" />
          <Input id="owner-env-channel" name="ownerEnvChannel" value={draft.releaseChannel} onChange={(e) => setDraft({ ...draft, releaseChannel: e.target.value })} placeholder="Release channel" />
          <Input id="owner-env-owner" name="ownerEnvOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-env-notes"
            name="ownerEnvNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Environment</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
