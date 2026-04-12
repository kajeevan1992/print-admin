
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flag, Search, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerFeatureFlagRecord, OwnerFeatureFlagScope, OwnerFeatureFlagStatus } from '@/data/owner-feature-flags';
import { ownerFeatureFlagsService } from '@/services/owner-feature-flags.service';

type StatusFilter = 'all' | OwnerFeatureFlagStatus;
type ScopeFilter = 'all' | OwnerFeatureFlagScope;

const emptyRecord: OwnerFeatureFlagRecord = {
  id: '',
  key: '',
  label: '',
  scope: 'tenant',
  target: '',
  status: 'draft',
  rollout: 0,
  owner: '',
  notes: '',
  updatedAt: '2026-04-11'
};

export function OwnerFeatureFlagsPage() {
  const [rows, setRows] = useState<OwnerFeatureFlagRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerFeatureFlagRecord | null>(null);

  async function load() {
    const data = await ownerFeatureFlagsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.key, row.label, row.target, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerFeatureFlagRecord) {
    await ownerFeatureFlagsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Feature Flags"
        subtitle="Manage SaaS-level rollout controls, pilot gates, && tenant-specific releases before wiring real backend flag orchestration."
        actions={<><Button onClick={() => ownerFeatureFlagsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `flag-${Date.now()}` })}>New Flag</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-flags-search" name="ownerFlagsSearch" placeholder="Search key, label, target, owner, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-flags-status" name="ownerFlagsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'enabled', label: 'Enabled' }, { value: 'paused', label: 'Paused' }]} />
        <Select id="owner-flags-scope" name="ownerFlagsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'global', label: 'Global' }, { value: 'pilot', label: 'Pilot' }, { value: 'tenant', label: 'Tenant' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Rollout controls</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.label}</p>
                    <p className="text-xs text-textMuted">{row.key} · {row.scope} · {row.target}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                    <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-200">{row.rollout}%</span>
                  </div>
                </div>
                <p className="text-sm text-textMuted">{row.notes}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No feature flags match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Flag spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Key" value={selected.key} />
                <MiniStat label="Target" value={selected.target} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Rollout" value={`${selected.rollout}%`} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'enabled', rollout: selected.rollout || 100, updatedAt: '2026-04-11' })}>Enable</Button>
                  <Button onClick={() => save({ ...selected, status: 'paused', updatedAt: '2026-04-11' })}>Pause</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Flag</Button>
                  <Button onClick={async () => { await ownerFeatureFlagsService.delete(selected.id); await load(); }}>Delete Flag</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a flag to review rollout controls.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model SaaS rollouts && pilot controls before wiring a real backend feature-flag provider.</p>
              <p>This is the right future surface for environment targeting, audit history, rollout %, && tenant overrides.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerFeatureFlagRecord; onClose: () => void; onSave: (value: OwnerFeatureFlagRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerFeatureFlagRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner feature flag' : 'New owner feature flag'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-flag-key" name="ownerFlagKey" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="Key" />
          <Input id="owner-flag-label" name="ownerFlagLabel" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Label" />
          <Select id="owner-flag-scope" name="ownerFlagScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerFeatureFlagScope })} options={[{ value: 'global', label: 'Global' }, { value: 'pilot', label: 'Pilot' }, { value: 'tenant', label: 'Tenant' }]} />
          <Select id="owner-flag-status" name="ownerFlagStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerFeatureFlagStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'enabled', label: 'Enabled' }, { value: 'paused', label: 'Paused' }]} />
          <Input id="owner-flag-target" name="ownerFlagTarget" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} placeholder="Target" />
          <Input id="owner-flag-owner" name="ownerFlagOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-flag-rollout" name="ownerFlagRollout" type="number" value={String(draft.rollout)} onChange={(e) => setDraft({ ...draft, rollout: Number(e.target.value) || 0 })} placeholder="Rollout %" />
          <Input id="owner-flag-updated" name="ownerFlagUpdated" value={draft.updatedAt} onChange={(e) => setDraft({ ...draft, updatedAt: e.target.value })} placeholder="Updated at" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-flag-notes"
            name="ownerFlagNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Flag</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
