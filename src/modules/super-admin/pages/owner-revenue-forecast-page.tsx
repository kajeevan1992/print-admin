'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartNoAxesCombined, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerRevenueForecastRecord, OwnerRevenueForecastScope, OwnerRevenueForecastStatus } from '@/data/owner-revenue-forecast';
import { ownerRevenueForecastService } from '@/services/owner-revenue-forecast.service';

type StatusFilter = 'all' | OwnerRevenueForecastStatus;
type ScopeFilter = 'all' | OwnerRevenueForecastScope;

const emptyRecord: OwnerRevenueForecastRecord = {
  id: '',
  tenant: '',
  title: '',
  scope: 'customer',
  status: 'draft',
  owner: '',
  forecastMonth: '',
  projectedValue: '',
  summary: ''
};

export function OwnerRevenueForecastPage() {
  const [rows, setRows] = useState<OwnerRevenueForecastRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerRevenueForecastRecord | null>(null);

  async function load() {
    const data = await ownerRevenueForecastService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.title, row.owner, row.projectedValue, row.summary].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerRevenueForecastRecord) {
    await ownerRevenueForecastService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Revenue Forecast"
        subtitle="Track owner-side revenue forecasts before wiring real financial planning, approvals, and commercial reporting."
        actions={<><Button onClick={() => ownerRevenueForecastService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `forecast-${Date.now()}` })}>New Forecast</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-forecast-search" name="ownerForecastSearch" placeholder="Search tenant, title, owner, value, || summary" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-forecast-status" name="ownerForecastStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'review', label: 'Review' }, { value: 'final', label: 'Final' }]} />
        <Select id="owner-forecast-scope" name="ownerForecastScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner revenue forecasts</div>
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
                <p className="text-sm text-textMuted">{row.forecastMonth} · {row.projectedValue}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No revenue forecasts match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ChartNoAxesCombined className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Forecast spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Status" value={selected.status} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Forecast month" value={selected.forecastMonth} />
                <MiniStat label="Projected value" value={selected.projectedValue} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'draft' })}>Mark Draft</Button>
                  <Button onClick={() => save({ ...selected, status: 'review' })}>Mark Review</Button>
                  <Button onClick={() => save({ ...selected, status: 'final' })}>Mark Final</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Forecast</Button>
                  <Button onClick={async () => { await ownerRevenueForecastService.delete(selected.id); await load(); }}>Delete Forecast</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a forecast to review projected value and scope.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model revenue forecasting before wiring real finance workflows, approvals, and reporting.</p>
              <p>This is the right future surface for forecast revisions, confidence levels, and executive rollups.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerRevenueForecastRecord; onClose: () => void; onSave: (value: OwnerRevenueForecastRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerRevenueForecastRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner revenue forecast' : 'New owner revenue forecast'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-forecast-tenant" name="ownerForecastTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-forecast-title" name="ownerForecastTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Select id="owner-forecast-scope-edit" name="ownerForecastScopeEdit" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerRevenueForecastScope })} options={[{ value: 'customer', label: 'Customer' }, { value: 'portfolio', label: 'Portfolio' }, { value: 'renewal', label: 'Renewal' }]} />
          <Select id="owner-forecast-status-edit" name="ownerForecastStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerRevenueForecastStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'review', label: 'Review' }, { value: 'final', label: 'Final' }]} />
          <Input id="owner-forecast-owner" name="ownerForecastOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-forecast-month" name="ownerForecastMonth" value={draft.forecastMonth} onChange={(e) => setDraft({ ...draft, forecastMonth: e.target.value })} placeholder="Forecast month" />
          <Input id="owner-forecast-value" name="ownerForecastValue" value={draft.projectedValue} onChange={(e) => setDraft({ ...draft, projectedValue: e.target.value })} placeholder="Projected value" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-forecast-summary"
            name="ownerForecastSummary"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Summary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Forecast</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
