
'use client';

import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerExecutiveBriefingRecord, OwnerExecutiveBriefingScope, OwnerExecutiveBriefingStatus } from '@/data/owner-executive-briefings';
import { ownerExecutiveBriefingsService } from '@/services/owner-executive-briefings.service';

type StatusFilter = 'all' | OwnerExecutiveBriefingStatus;
type ScopeFilter = 'all' | OwnerExecutiveBriefingScope;

const emptyRecord: OwnerExecutiveBriefingRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'customer',
  status: 'draft',
  owner: '',
  briefingDate: '',
  audience: '',
  summary: ''
};

export function OwnerExecutiveBriefingsPage() {
  const [rows, setRows] = useState<OwnerExecutiveBriefingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerExecutiveBriefingRecord | null>(null);

  async function load() {
    const data = await ownerExecutiveBriefingsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.audience, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerExecutiveBriefingRecord) {
    await ownerExecutiveBriefingsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Executive Briefings"
        subtitle="Track executive briefings before wiring real decks, audience routing, and follow-up actions."
        actions={<><Button onClick={() => ownerExecutiveBriefingsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `briefing-${Date.now()}` })}>New Briefing</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-briefings-search" name="ownerBriefingsSearch" placeholder="Search tenant, title, owner, audience, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-briefings-status" name="ownerBriefingsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'delivered', label: 'Delivered' }]} />
        <Select id="owner-briefings-scope" name="ownerBriefingsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner executive briefings</div>
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
                <p className="text-sm text-textMuted">{row.briefingDate} · {row.audience}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No executive briefings match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Briefing spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Briefing date" value={selected.briefingDate} />
                <MiniStat label="Audience" value={selected.audience} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'draft' })}>Mark Draft</Button>
                  <Button onClick={() => save({ ...selected, status: 'scheduled' })}>Mark Scheduled</Button>
                  <Button onClick={() => save({ ...selected, status: 'delivered' })}>Mark Delivered</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Briefing</Button>
                  <Button onClick={async () => { await ownerExecutiveBriefingsService.delete(selected.id); await load(); }}>Delete Briefing</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a briefing to review audience and delivery status.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model executive briefings before wiring decks, notes, and stakeholder follow-up automation.</p>
              <p>This is the right future surface for briefing packs, distribution lists, and executive-level summaries.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerExecutiveBriefingRecord; onClose: () => void; onSave: (value: OwnerExecutiveBriefingRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerExecutiveBriefingRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner executive briefing' : 'New owner executive briefing'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-briefing-tenant" name="ownerBriefingTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-briefing-title" name="ownerBriefingTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-briefing-scope-edit" name="ownerBriefingScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerExecutiveBriefingScope })} options={[{ value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
          <Select id="owner-briefing-status-edit" name="ownerBriefingStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerExecutiveBriefingStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'delivered', label: 'Delivered' }]} />
          <Input id="owner-briefing-owner" name="ownerBriefingOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-briefing-date" name="ownerBriefingDate" value={draft.briefingDate} onChange={(e) => setDraft({ ...draft, briefingDate: e.target.value })} placeholder="Briefing date" />
          <Input id="owner-briefing-audience" name="ownerBriefingAudience" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} placeholder="Audience" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-briefing-summary"
            name="ownerBriefingSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Briefing</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
