
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerRetentionRecord, OwnerRetentionScope, OwnerRetentionStatus } from '@/data/owner-data-retention';
import { ownerDataRetentionService } from '@/services/owner-data-retention.service';

type StatusFilter = 'all' | OwnerRetentionStatus;
type ScopeFilter = 'all' | OwnerRetentionScope;

const emptyRecord: OwnerRetentionRecord = {
  id: '',
  tenant: '',
  category: '',
  scope: 'tenant',
  status: 'active',
  retentionPeriod: '',
  nextReviewDate: '',
  owner: '',
  summary: ''
};

export function OwnerDataRetentionPage() {
  const [rows, setRows] = useState<OwnerRetentionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerRetentionRecord | null>(null);

  async function load() {
    const data = await ownerDataRetentionService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.category, row.owner, row.retentionPeriod, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerRetentionRecord) {
    await ownerDataRetentionService.save(record);
    setEditing(null)
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Data Retention"
        subtitle="Manage owner-side retention policies before wiring real archival jobs, policy enforcement, and compliance reporting."
        actions={<><Button onClick={() => ownerDataRetentionService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `retention-${Date.now()}` })}>New Retention Rule</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-retention-search" name="ownerRetentionSearch" placeholder="Search tenant, category, owner, period, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-retention-status" name="ownerRetentionStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'review', label: 'Review' }, { value: 'expired', label: 'Expired' }]} />
        <Select id="owner-retention-scope" name="ownerRetentionScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'compliance', label: 'Compliance' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner data-retention rules</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.category}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.scope} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.retentionPeriod} · {row.nextReviewDate}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No retention rules match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Archive className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Retention spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Period" value={selected.retentionPeriod} />
                <MiniStat label="Next review" value={selected.nextReviewDate} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'review' })}>Mark Review</Button>
                  <Button onClick={() => save({ ...selected, status: 'expired' })}>Mark Expired</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Retention Rule</Button>
                  <Button onClick={async () => { await ownerDataRetentionService.delete(selected.id); await load(); }}>Delete Retention Rule</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a retention rule to review lifecycle and review dates.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model data-retention policy before wiring real archival tasks, deletion workflows, and evidence exports.</p>
              <p>This is the right future surface for retention exceptions, legal holds, and policy-linked compliance automation.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerRetentionRecord; onClose: () => void; onSave: (value: OwnerRetentionRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerRetentionRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner retention rule' : 'New owner retention rule'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-retention-tenant" name="ownerRetentionTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-retention-category" name="ownerRetentionCategory" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category" />
          <Select id="owner-retention-scope-edit" name="ownerRetentionScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerRetentionScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'compliance', label: 'Compliance' }]} />
          <Select id="owner-retention-status-edit" name="ownerRetentionStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerRetentionStatus })} options={[{ value: 'active', label: 'Active' }, { value: 'review', label: 'Review' }, { value: 'expired', label: 'Expired' }]} />
          <Input id="owner-retention-period" name="ownerRetentionPeriod" value={draft.retentionPeriod} onChange={(e) => setDraft({ ...draft, retentionPeriod: e.target.value })} placeholder="Retention period" />
          <Input id="owner-retention-review" name="ownerRetentionReview" value={draft.nextReviewDate} onChange={(e) => setDraft({ ...draft, nextReviewDate: e.target.value })} placeholder="Next review date" />
          <Input id="owner-retention-owner" name="ownerRetentionOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-retention-summary"
            name="ownerRetentionSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Retention Rule</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
