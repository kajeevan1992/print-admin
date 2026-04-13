
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerComplianceRecord, OwnerComplianceScope, OwnerComplianceStatus } from '@/data/owner-compliance-center';
import { ownerComplianceCenterService } from '@/services/owner-compliance-center.service';

type StatusFilter = 'all' | OwnerComplianceStatus;
type ScopeFilter = 'all' | OwnerComplianceScope;

const emptyRecord: OwnerComplianceRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'tenant',
  status: 'review',
  dueDate: '',
  owner: '',
  evidence: '',
  summary: ''
};

export function OwnerComplianceCenterPage() {
  const [rows, setRows] = useState<OwnerComplianceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerComplianceRecord | null>(null);

  async function load() {
    const data = await ownerComplianceCenterService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.evidence, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerComplianceRecord) {
    await ownerComplianceCenterService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Compliance Center"
        subtitle="Manage owner-side compliance reviews before wiring evidence storage, approvals, and audit reporting."
        actions={<><Button onClick={() => ownerComplianceCenterService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `compliance-${Date.now()}` })}>New Compliance Check</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-compliance-search" name="ownerComplianceSearch" placeholder="Search tenant, title, owner, evidence, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-compliance-status" name="ownerComplianceStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'compliant', label: 'Compliant' }, { value: 'review', label: 'Review' }, { value: 'overdue', label: 'Overdue' }]} />
        <Select id="owner-compliance-scope" name="ownerComplianceScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'security', label: 'Security' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner compliance checks</div>
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
                <p className="text-sm text-textMuted">{row.dueDate} · {row.evidence}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No compliance checks match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Compliance spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Due date" value={selected.dueDate} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Evidence" value={selected.evidence} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'compliant' })}>Mark Compliant</Button>
                  <Button onClick={() => save({ ...selected, status: 'review' })}>Mark Review</Button>
                  <Button onClick={() => save({ ...selected, status: 'overdue' })}>Mark Overdue</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Compliance Check</Button>
                  <Button onClick={async () => { await ownerComplianceCenterService.delete(selected.id); await load(); }}>Delete Compliance Check</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a compliance check to review status and evidence.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model compliance workflows before wiring real audit evidence, approver sign-off, and recurring review automation.</p>
              <p>This is the right future surface for certifications, policy reviews, and exportable compliance reporting.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerComplianceRecord; onClose: () => void; onSave: (value: OwnerComplianceRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerComplianceRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner compliance check' : 'New owner compliance check'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-compliance-tenant" name="ownerComplianceTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-compliance-title" name="ownerComplianceTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-compliance-scope-edit" name="ownerComplianceScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerComplianceScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'security', label: 'Security' }]} />
          <Select id="owner-compliance-status-edit" name="ownerComplianceStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerComplianceStatus })} options={[{ value: 'compliant', label: 'Compliant' }, { value: 'review', label: 'Review' }, { value: 'overdue', label: 'Overdue' }]} />
          <Input id="owner-compliance-due-date" name="ownerComplianceDueDate" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} placeholder="Due date" />
          <Input id="owner-compliance-owner" name="ownerComplianceOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-compliance-evidence" name="ownerComplianceEvidence" value={draft.evidence} onChange={(e) => setDraft({ ...draft, evidence: e.target.value })} placeholder="Evidence" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-compliance-summary"
            name="ownerComplianceSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Compliance Check</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
