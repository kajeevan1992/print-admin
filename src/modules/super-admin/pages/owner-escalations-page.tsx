'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerEscalationDomain, OwnerEscalationRecord, OwnerEscalationSeverity, OwnerEscalationStatus } from '@/data/owner-escalations';
import { ownerEscalationsService } from '@/services/owner-escalations.service';

type FilterState = 'all' | OwnerEscalationStatus;
type FilterSeverity = 'all' | OwnerEscalationSeverity;
type FilterDomain = 'all' | OwnerEscalationDomain;

const severityTone: Record<OwnerEscalationSeverity, string> = {
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  high: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
};

const statusTone: Record<OwnerEscalationStatus, string> = {
  open: 'border-slate-400/25 bg-slate-400/10 text-slate-200',
  investigating: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  blocked: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  resolved: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
};

const emptyRecord: OwnerEscalationRecord = {
  id: '',
  tenant: '',
  domain: 'support',
  title: '',
  summary: '',
  severity: 'watch',
  status: 'open',
  owner: '',
  updatedAt: '2026-04-11'
};

export function OwnerEscalationsPage() {
  const [rows, setRows] = useState<OwnerEscalationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterState>('all');
  const [severity, setSeverity] = useState<FilterSeverity>('all');
  const [domain, setDomain] = useState<FilterDomain>('all');
  const [editing, setEditing] = useState<OwnerEscalationRecord | null>(null);

  async function load() {
    const data = await ownerEscalationsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.summary, row.owner, row.domain].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesSeverity = severity === 'all' || row.severity === severity;
    const matchesDomain = domain === 'all' || row.domain === domain;
    return matchesQuery && matchesStatus && matchesSeverity && matchesDomain;
  }), [rows, search, status, severity, domain]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const stats = useMemo(() => ({
    critical: rows.filter((row) => row.severity === 'critical').length,
    blocked: rows.filter((row) => row.status === 'blocked').length,
    open: rows.filter((row) => row.status !== 'resolved').length
  }), [rows]);

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
        subtitle="Track high-visibility issues across billing, launches, deployment, and support so the SaaS owner team can intervene quickly."
        actions={<><Button onClick={() => ownerEscalationsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `esc-${Date.now()}` })}>New Escalation</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Critical" value={String(stats.critical)} />
        <MetricCard label="Blocked" value={String(stats.blocked)} />
        <MetricCard label="Open" value={String(stats.open)} />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1.5fr_repeat(3,180px)]">
        <Input id="owner-escalations-search" name="ownerEscalationsSearch" placeholder="Search tenant, owner, title, or summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-escalations-status" name="ownerEscalationsStatus" value={status} onChange={(e) => setStatus(e.target.value as FilterState)} options={[{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' }, { value: 'blocked', label: 'Blocked' }, { value: 'resolved', label: 'Resolved' }]} />
        <Select id="owner-escalations-severity" name="ownerEscalationsSeverity" value={severity} onChange={(e) => setSeverity(e.target.value as FilterSeverity)} options={[{ value: 'all', label: 'All severity' }, { value: 'watch', label: 'Watch' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
        <Select id="owner-escalations-domain" name="ownerEscalationsDomain" value={domain} onChange={(e) => setDomain(e.target.value as FilterDomain)} options={[{ value: 'all', label: 'All domains' }, { value: 'billing', label: 'Billing' }, { value: 'activation', label: 'Activation' }, { value: 'deployment', label: 'Deployment' }, { value: 'support', label: 'Support' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner issue watchlist</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.title}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.domain} · {row.owner}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={severityTone[row.severity]}>{row.severity}</Badge>
                    <Badge className={statusTone[row.status]}>{row.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-textMuted">{row.summary}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No escalations match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Escalation spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Tenant</p>
                  <p className="mt-1 text-white">{selected.tenant}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Title</p>
                  <p className="mt-1 text-white">{selected.title}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniStat label="Domain" value={selected.domain} />
                  <MiniStat label="Owner" value={selected.owner} />
                  <MiniStat label="Severity" value={selected.severity} />
                  <MiniStat label="Status" value={selected.status} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'investigating', updatedAt: '2026-04-11' })}>Start Investigating</Button>
                  <Button onClick={() => save({ ...selected, status: 'resolved', severity: selected.severity === 'critical' ? 'high' : 'watch', updatedAt: '2026-04-11' })}>Mark Resolved</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Escalation</Button>
                  <Button onClick={async () => { await ownerEscalationsService.delete(selected.id); await load(); }}>Delete Escalation</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an escalation to see owner actions and context.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Keep critical billing and launch blockers visible to the owner team until the tenant is stable.</p>
              <p>Use this queue as the final manual watchlist before wiring alerts, support systems, and API automations.</p>
            </div>
          </Card>
        </div>
      </div>

      {editing && (
        <EditModal
          value={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => void save(next)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Card>
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

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${className}`}>{children}</span>;
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
          <Input id="owner-escalation-owner" name="ownerEscalationOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Select id="owner-escalation-domain" name="ownerEscalationDomain" value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value as OwnerEscalationDomain })} options={[{ value: 'billing', label: 'Billing' }, { value: 'activation', label: 'Activation' }, { value: 'deployment', label: 'Deployment' }, { value: 'support', label: 'Support' }]} />
          <Select id="owner-escalation-severity" name="ownerEscalationSeverity" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as OwnerEscalationSeverity })} options={[{ value: 'watch', label: 'Watch' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
          <Select id="owner-escalation-status" name="ownerEscalationStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerEscalationStatus })} options={[{ value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' }, { value: 'blocked', label: 'Blocked' }, { value: 'resolved', label: 'Resolved' }]} />
          <Input id="owner-escalation-updated" name="ownerEscalationUpdated" value={draft.updatedAt} onChange={(e) => setDraft({ ...draft, updatedAt: e.target.value })} placeholder="Updated at" />
        </div>
        <div className="mt-3 grid gap-3">
          <Input id="owner-escalation-title" name="ownerEscalationTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <textarea
            id="owner-escalation-summary"
            name="ownerEscalationSummary"
            className="min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
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
