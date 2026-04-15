'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerCommercialApprovalRecord, OwnerCommercialApprovalScope, OwnerCommercialApprovalStatus } from '@/data/owner-commercial-approvals';
import { ownerCommercialApprovalsService } from '@/services/owner-commercial-approvals.service';

type StatusFilter = 'all' | OwnerCommercialApprovalStatus;
type ScopeFilter = 'all' | OwnerCommercialApprovalScope;

const emptyRecord: OwnerCommercialApprovalRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'pricing',
  status: 'pending',
  owner: '',
  approver: '',
  effectiveDate: '',
  summary: ''
};

export function OwnerCommercialApprovalsPage() {
  const [rows, setRows] = useState<OwnerCommercialApprovalRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerCommercialApprovalRecord | null>(null);

  async function load() {
    const data = await ownerCommercialApprovalsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.approver, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerCommercialApprovalRecord) {
    await ownerCommercialApprovalsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Commercial Approvals"
        subtitle="Track owner-side commercial approvals before wiring real deal workflows, sign-off routing, and contract automation."
        actions={<><Button onClick={() => ownerCommercialApprovalsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `commercial-${Date.now()}` })}>New Approval</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-commercial-search" name="ownerCommercialSearch" placeholder="Search tenant, title, owner, approver, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-commercial-status" name="ownerCommercialStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        <Select id="owner-commercial-scope" name="ownerCommercialScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'pricing', label: 'Pricing' }, { value: 'discount', label: 'Discount' }, { value: 'contract', label: 'Contract' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner commercial approvals</div>
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
                <p className="text-sm text-textMuted">{row.effectiveDate} · {row.approver}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No commercial approvals match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Approval spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Approver" value={selected.approver} />
                <MiniStat label="Effective date" value={selected.effectiveDate} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'pending' })}>Mark Pending</Button>
                  <Button onClick={() => save({ ...selected, status: 'approved' })}>Approve</Button>
                  <Button onClick={() => save({ ...selected, status: 'rejected' })}>Reject</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Approval</Button>
                  <Button onClick={async () => { await ownerCommercialApprovalsService.delete(selected.id); await load(); }}>Delete Approval</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an approval to review commercial ownership and outcome.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model commercial approvals before wiring routing, deal governance, and sign-off automation.</p>
              <p>This is the right future surface for approval history, effective dates, and downstream commercial actions.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerCommercialApprovalRecord; onClose: () => void; onSave: (value: OwnerCommercialApprovalRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerCommercialApprovalRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner commercial approval' : 'New owner commercial approval'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-commercial-tenant" name="ownerCommercialTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-commercial-title" name="ownerCommercialTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-commercial-scope-edit" name="ownerCommercialScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerCommercialApprovalScope })} options={[{ value: 'pricing', label: 'Pricing' }, { value: 'discount', label: 'Discount' }, { value: 'contract', label: 'Contract' }]} />
          <Select id="owner-commercial-status-edit" name="ownerCommercialStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerCommercialApprovalStatus })} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
          <Input id="owner-commercial-owner" name="ownerCommercialOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-commercial-approver" name="ownerCommercialApprover" value={draft.approver} onChange={(e) => setDraft({ ...draft, approver: e.target.value })} placeholder="Approver" />
          <Input id="owner-commercial-date" name="ownerCommercialDate" value={draft.effectiveDate} onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })} placeholder="Effective date" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-commercial-summary"
            name="ownerCommercialSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Approval</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
