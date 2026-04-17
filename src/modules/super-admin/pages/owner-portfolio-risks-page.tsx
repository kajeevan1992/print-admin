
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerPortfolioRiskRecord, OwnerPortfolioRiskScope, OwnerPortfolioRiskStatus } from '@/data/owner-portfolio-risks';
import { ownerPortfolioRisksService } from '@/services/owner-portfolio-risks.service';

type StatusFilter = 'all' | OwnerPortfolioRiskStatus;
type ScopeFilter = 'all' | OwnerPortfolioRiskScope;

const emptyRecord: OwnerPortfolioRiskRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'customer',
  status: 'open',
  impact: '',
  owner: '',
  dueDate: '',
  mitigationPlan: ''
};

export function OwnerPortfolioRisksPage() {
  const [rows, setRows] = useState<OwnerPortfolioRiskRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerPortfolioRiskRecord | null>(null);

  async function load() {
    const data = await ownerPortfolioRisksService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.impact, row.mitigationPlan].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerPortfolioRiskRecord) {
    await ownerPortfolioRisksService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Portfolio Risks"
        subtitle="Track cross-customer and commercial risks before wiring real escalations, scorecards, and follow-up workflows."
        actions={<><Button onClick={() => ownerPortfolioRisksService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `risk-${Date.now()}` })}>New Risk</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-risks-search" name="ownerRisksSearch" placeholder="Search tenant, title, owner, impact, || plan" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-risks-status" name="ownerRisksStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'watching', label: 'Watching' }, { value: 'mitigated', label: 'Mitigated' }]} />
        <Select id="owner-risks-scope" name="ownerRisksScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'customer', label: 'Customer' }, { value: 'revenue', label: 'Revenue' }, { value: 'operations', label: 'Operations' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner portfolio risks</div>
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
                <p className="text-sm text-textMuted">{row.impact} · {row.dueDate}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No portfolio risks match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Risk spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Impact" value={selected.impact} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Due date" value={selected.dueDate} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Mitigation plan</p>
                  <p className="mt-1 text-textMuted">{selected.mitigationPlan}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'open' })}>Mark Open</Button>
                  <Button onClick={() => save({ ...selected, status: 'watching' })}>Mark Watching</Button>
                  <Button onClick={() => save({ ...selected, status: 'mitigated' })}>Mark Mitigated</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Risk</Button>
                  <Button onClick={async () => { await ownerPortfolioRisksService.delete(selected.id); await load(); }}>Delete Risk</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a risk to review ownership and mitigation.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model portfolio-risk tracking before wiring real alerts, ownership routing, and commercial intervention plans.</p>
              <p>This is the right future surface for trend scoring, linked accounts, and executive escalation summaries.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerPortfolioRiskRecord; onClose: () => void; onSave: (value: OwnerPortfolioRiskRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerPortfolioRiskRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner portfolio risk' : 'New owner portfolio risk'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-risk-tenant" name="ownerRiskTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-risk-title" name="ownerRiskTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-risk-scope-edit" name="ownerRiskScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerPortfolioRiskScope })} options={[{ value: 'customer', label: 'Customer' }, { value: 'revenue', label: 'Revenue' }, { value: 'operations', label: 'Operations' }]} />
          <Select id="owner-risk-status-edit" name="ownerRiskStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerPortfolioRiskStatus })} options={[{ value: 'open', label: 'Open' }, { value: 'watching', label: 'Watching' }, { value: 'mitigated', label: 'Mitigated' }]} />
          <Input id="owner-risk-impact" name="ownerRiskImpact" value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })} placeholder="Impact" />
          <Input id="owner-risk-owner" name="ownerRiskOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-risk-due-date" name="ownerRiskDueDate" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} placeholder="Due date" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-risk-plan"
            name="ownerRiskPlan"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.mitigationPlan}
            onChange={(e) => setDraft({ ...draft, mitigationPlan: e.target.value })}
            placeholder="Mitigation plan"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Risk</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
