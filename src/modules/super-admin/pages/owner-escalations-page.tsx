
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Siren } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerEscalationRecord, OwnerEscalationScope, OwnerEscalationStatus } from '@/data/owner-escalations';
import { ownerEscalationsService } from '@/services/owner-escalations.service';

type StatusFilter = 'all' | OwnerEscalationStatus;
type ScopeFilter = 'all' | OwnerEscalationScope;

const emptyRecord: OwnerEscalationRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'customer',
  status: 'open',
  severity: '',
  owner: '',
  dueDate: '',
  summary: ''
};

export function OwnerEscalationsPage() {
  const [rows, setRows] = useState<OwnerEscalationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerEscalationRecord | null>(null);

  async function load() {
    const data = await ownerEscalationsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.severity, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerEscalationRecord) {
    await ownerEscalationsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Escalations"
        subtitle="Track owner-side escalations before wiring alert routing, approvals, and follow-up workflows."
        actions={<><Button onClick={() => ownerEscalationsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `escalation-${Date.now()}` })}>New Escalation</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-escalations-search" name="ownerEscalationsSearch" placeholder="Search tenant, title, owner, severity, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-escalations-status" name="ownerEscalationsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'monitoring', label: 'Monitoring' }, { value: 'resolved', label: 'Resolved' }]} />
        <Select id="owner-escalations-scope" name="ownerEscalationsScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'customer', label: 'Customer' }, { value: 'billing', label: 'Billing' }, { value: 'technical', label: 'Technical' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner escalations</div>
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
                <p className="text-sm text-textMuted">{row.severity} · {row.dueDate}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No escalations match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Siren className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Escalation spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Severity" value={selected.severity} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Due date" value={selected.dueDate} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'open' })}>Mark Open</Button>
                  <Button onClick={() => save({ ...selected, status: 'monitoring' })}>Mark Monitoring</Button>
                  <Button onClick={() => save({ ...selected, status: 'resolved' })}>Mark Resolved</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Escalation</Button>
                  <Button onClick={async () => { await ownerEscalationsService.delete(selected.id); await load(); }}>Delete Escalation</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an escalation to review ownership and urgency.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model escalation handling before wiring alerts, routing, and follow-up workflows.</p>
              <p>This is the right future surface for escalation history, SLA tracking, and executive visibility.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerEscalationRecord; onClose: () => void; onSave: (value: OwnerEscalationRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerEscalationRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner escalation' : 'New owner escalation'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-escalation-tenant" name="ownerEscalationTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-escalation-title" name="ownerEscalationTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-escalation-scope-edit" name="ownerEscalationScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerEscalationScope })} options={[{ value: 'customer', label: 'Customer' }, { value: 'billing', label: 'Billing' }, { value: 'technical', label: 'Technical' }]} />
          <Select id="owner-escalation-status-edit" name="ownerEscalationStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerEscalationStatus })} options={[{ value: 'open', label: 'Open' }, { value: 'monitoring', label: 'Monitoring' }, { value: 'resolved', label: 'Resolved' }]} />
          <Input id="owner-escalation-severity" name="ownerEscalationSeverity" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} placeholder="Severity" />
          <Input id="owner-escalation-owner" name="ownerEscalationOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-escalation-due-date" name="ownerEscalationDueDate" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} placeholder="Due date" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-escalation-summary"
            name="ownerEscalationSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Escalation</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
