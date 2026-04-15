
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerStakeholderRecord, OwnerStakeholderRole, OwnerStakeholderStatus } from '@/data/owner-stakeholder-map';
import { ownerStakeholderMapService } from '@/services/owner-stakeholder-map.service';

type StatusFilter = 'all' | OwnerStakeholderStatus;
type RoleFilter = 'all' | OwnerStakeholderRole;

const emptyRecord: OwnerStakeholderRecord = {
  id: '',
  tenant: '',
  name: '',
  role: 'executive',
  status: 'active',
  owner: '',
  influenceLevel: '',
  lastTouchpoint: '',
  summary: ''
};

export function OwnerStakeholderMapPage() {
  const [rows, setRows] = useState<OwnerStakeholderRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [editing, setEditing] = useState<OwnerStakeholderRecord | null>(null);

  async function load() {
    const data = await ownerStakeholderMapService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.name, row.owner, row.influenceLevel, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesRole = role === 'all' || row.role === role;
    return matchesQuery && matchesStatus && matchesRole;
  }), [rows, search, status, role]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerStakeholderRecord) {
    await ownerStakeholderMapService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Stakeholder Map"
        subtitle="Track key customer stakeholders before wiring relationship intelligence, outreach workflows, and executive alignment plans."
        actions={<><Button onClick={() => ownerStakeholderMapService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `stakeholder-${Date.now()}` })}>New Stakeholder</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-stakeholder-search" name="ownerStakeholderSearch" placeholder="Search tenant, name, owner, influence, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-stakeholder-status" name="ownerStakeholderStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'watch', label: 'Watch' }, { value: 'inactive', label: 'Inactive' }]} />
        <Select id="owner-stakeholder-role" name="ownerStakeholderRole" value={role} onChange={(e) => setRole(e.target.value as RoleFilter)} options={[{ value: 'all', label: 'All roles' }, { value: 'executive', label: 'Executive' }, { value: 'admin', label: 'Admin' }, { value: 'champion', label: 'Champion' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner stakeholder records</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.name}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.role} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.influenceLevel} · {row.lastTouchpoint}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No stakeholders match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Stakeholder spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Role" value={selected.role} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Influence" value={selected.influenceLevel} />
                <MiniStat label="Last touchpoint" value={selected.lastTouchpoint} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'watch' })}>Mark Watch</Button>
                  <Button onClick={() => save({ ...selected, status: 'inactive' })}>Mark Inactive</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Stakeholder</Button>
                  <Button onClick={async () => { await ownerStakeholderMapService.delete(selected.id); await load(); }}>Delete Stakeholder</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a stakeholder to review role and influence.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model stakeholder relationships before wiring outreach cadences, executive mapping, and sponsor tracking.</p>
              <p>This is the right future surface for influence mapping, role transitions, and relationship health.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerStakeholderRecord; onClose: () => void; onSave: (value: OwnerStakeholderRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerStakeholderRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner stakeholder' : 'New owner stakeholder'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-stakeholder-tenant" name="ownerStakeholderTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-stakeholder-name" name="ownerStakeholderName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
          <Select id="owner-stakeholder-role-edit" name="ownerStakeholderRoleEdit" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as OwnerStakeholderRole })} options={[{ value: 'executive', label: 'Executive' }, { value: 'admin', label: 'Admin' }, { value: 'champion', label: 'Champion' }]} />
          <Select id="owner-stakeholder-status-edit" name="ownerStakeholderStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerStakeholderStatus })} options={[{ value: 'active', label: 'Active' }, { value: 'watch', label: 'Watch' }, { value: 'inactive', label: 'Inactive' }]} />
          <Input id="owner-stakeholder-owner" name="ownerStakeholderOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-stakeholder-influence" name="ownerStakeholderInfluence" value={draft.influenceLevel} onChange={(e) => setDraft({ ...draft, influenceLevel: e.target.value })} placeholder="Influence level" />
          <Input id="owner-stakeholder-touchpoint" name="ownerStakeholderTouchpoint" value={draft.lastTouchpoint} onChange={(e) => setDraft({ ...draft, lastTouchpoint: e.target.value })} placeholder="Last touchpoint" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-stakeholder-summary"
            name="ownerStakeholderSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Stakeholder</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
