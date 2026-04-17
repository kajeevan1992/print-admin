'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerExpansionPipelineRecord, OwnerExpansionPipelineScope, OwnerExpansionPipelineStatus } from '@/data/owner-expansion-pipeline';
import { ownerExpansionPipelineService } from '@/services/owner-expansion-pipeline.service';

type StatusFilter = 'all' | OwnerExpansionPipelineStatus;
type ScopeFilter = 'all' | OwnerExpansionPipelineScope;

const emptyRecord: OwnerExpansionPipelineRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'customer',
  status: 'identified',
  owner: '',
  targetCloseDate: '',
  opportunityValue: '',
  summary: ''
};

export function OwnerExpansionPipelinePage() {
  const [rows, setRows] = useState<OwnerExpansionPipelineRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerExpansionPipelineRecord | null>(null);

  async function load() {
    const data = await ownerExpansionPipelineService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.opportunityValue, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerExpansionPipelineRecord) {
    await ownerExpansionPipelineService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Expansion Pipeline"
        subtitle="Track owner-side expansion opportunities before wiring real commercial workflows, approvals, and pipeline reporting."
        actions={<><Button onClick={() => ownerExpansionPipelineService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `expansion-${Date.now()}` })}>New Opportunity</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-expansion-search" name="ownerExpansionSearch" placeholder="Search tenant, title, owner, value, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-expansion-status" name="ownerExpansionStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'identified', label: 'Identified' }, { value: 'active', label: 'Active' }, { value: 'won', label: 'Won' }]} />
        <Select id="owner-expansion-scope" name="ownerExpansionScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner expansion opportunities</div>
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
                <p className="text-sm text-textMuted">{row.targetCloseDate} · {row.opportunityValue}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No expansion opportunities match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Opportunity spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Target close" value={selected.targetCloseDate} />
                <MiniStat label="Opportunity value" value={selected.opportunityValue} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'identified' })}>Mark Identified</Button>
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'won' })}>Mark Won</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Opportunity</Button>
                  <Button onClick={async () => { await ownerExpansionPipelineService.delete(selected.id); await load(); }}>Delete Opportunity</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an expansion opportunity to review value and timing.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model expansion pipeline tracking before wiring real deal stages, approvals, and reporting.</p>
              <p>This is the right future surface for pipeline confidence, linked approvals, and commercial handoffs.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerExpansionPipelineRecord; onClose: () => void; onSave: (value: OwnerExpansionPipelineRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerExpansionPipelineRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner expansion opportunity' : 'New owner expansion opportunity'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-expansion-tenant" name="ownerExpansionTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-expansion-title" name="ownerExpansionTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-expansion-scope-edit" name="ownerExpansionScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerExpansionPipelineScope })} options={[{ value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
          <Select id="owner-expansion-status-edit" name="ownerExpansionStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerExpansionPipelineStatus })} options={[{ value: 'identified', label: 'Identified' }, { value: 'active', label: 'Active' }, { value: 'won', label: 'Won' }]} />
          <Input id="owner-expansion-owner" name="ownerExpansionOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-expansion-close-date" name="ownerExpansionCloseDate" value={draft.targetCloseDate} onChange={(e) => setDraft({ ...draft, targetCloseDate: e.target.value })} placeholder="Target close date" />
          <Input id="owner-expansion-value" name="ownerExpansionValue" value={draft.opportunityValue} onChange={(e) => setDraft({ ...draft, opportunityValue: e.target.value })} placeholder="Opportunity value" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-expansion-summary"
            name="ownerExpansionSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Opportunity</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
