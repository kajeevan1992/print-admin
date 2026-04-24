
'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerRunbookRecord, OwnerRunbookScope, OwnerRunbookStatus } from '@/data/owner-runbooks';
import { ownerRunbooksService } from '@/services/owner-runbooks.service';

type StatusFilter = 'all' | OwnerRunbookStatus;
type ScopeFilter = 'all' | OwnerRunbookScope;

const emptyRecord: OwnerRunbookRecord = {
  id: '',
  title: '',
  scope: 'incident',
  status: 'draft',
  tenant: '',
  owner: '',
  version: 'v1.0',
  updatedAt: '2026-04-12',
  summary: ''
};

export function OwnerRunbooksPage() {
  const [rows, setRows] = useState<OwnerRunbookRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerRunbookRecord | null>(null);

  async function load() {
    const data = await ownerRunbooksService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.title, row.tenant, row.owner, row.version, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerRunbookRecord) {
    await ownerRunbooksService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Runbooks"
        subtitle="Manage owner-side operational runbooks before wiring real document storage, approvals, and linked incident workflows."
        actions={<><Button onClick={() => ownerRunbooksService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `runbook-${Date.now()}` })}>New Runbook</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-runbooks-search" name="ownerRunbooksSearch" placeholder="Search title, tenant, owner, version, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-runbooks-status" name="ownerRunbooksStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
        <Select id="owner-runbooks-scope" name="ownerRunbooksScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'incident', label: 'Incident' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'onboarding', label: 'Onboarding' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed runbooks</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.title}</p>
                    <p className="text-xs text-textMuted">{row.scope} · {row.tenant} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.version} · {row.updatedAt}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No runbooks match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Runbook spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Version" value={selected.version} />
                <MiniStat label="Updated" value={selected.updatedAt} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Mark Active</Button>
                  <Button onClick={() => save({ ...selected, status: 'archived' })}>Archive</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Runbook</Button>
                  <Button onClick={async () => { await ownerRunbooksService.delete(selected.id); await load(); }}>Delete Runbook</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a runbook to review operational guidance.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model operational guidance before wiring real docs, approvals, and incident-linked action tracking.</p>
              <p>This is the right future surface for structured steps, attachments, version history, and sign-off flows.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerRunbookRecord; onClose: () => void; onSave: (value: OwnerRunbookRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerRunbookRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner runbook' : 'New owner runbook'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-runbook-title" name="ownerRunbookTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Input id="owner-runbook-tenant" name="ownerRunbookTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-runbook-scope" name="ownerRunbookScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerRunbookScope })} options={[{ value: 'incident', label: 'Incident' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'onboarding', label: 'Onboarding' }]} />
          <Select id="owner-runbook-status" name="ownerRunbookStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerRunbookStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
          <Input id="owner-runbook-owner" name="ownerRunbookOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-runbook-version" name="ownerRunbookVersion" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="Version" />
          <Input id="owner-runbook-updated" name="ownerRunbookUpdated" value={draft.updatedAt} onChange={(e) => setDraft({ ...draft, updatedAt: e.target.value })} placeholder="Updated at" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-runbook-summary"
            name="ownerRunbookSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Runbook</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
