'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, KeyRound, Search, ShieldAlert, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { BaseModal } from '@/components/modals/base-modal';
import { licensingCenterService } from '@/services/licensing-center.service';
import type { LicenseRecord, LicenseStatus } from '@/data/licensing-center';

const statusOptions: Array<'all' | LicenseStatus> = ['all', 'active', 'trial', 'grace', 'paused'];
const riskTone = {
  healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
} as const;
const statusTone = {
  active: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  trial: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  grace: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  paused: 'border-slate-400/25 bg-slate-400/10 text-slate-200'
} as const;
const emptyRecord: LicenseRecord = { id: '', company: '', plan: 'Starter', status: 'trial', seatsUsed: 1, seatLimit: 5, apiAccess: false, storesAllowed: 1, renewalDate: '2026-05-01', overageRisk: 'healthy', notes: '' };

export function LicensingCenterPage() {
  const [rows, setRows] = useState<LicenseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | LicenseStatus>('all');
  const [editing, setEditing] = useState<LicenseRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() { const data = await licensingCenterService.list(); setRows(data); setSelectedId((curr) => curr ?? data[0]?.id ?? null); }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((row) => {
    const hay = `${row.company} ${row.plan} ${row.notes}`.toLowerCase();
    return (!search || hay.includes(search.toLowerCase())) && (status === 'all' || row.status === status);
  }), [rows, search, status]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const kpis = useMemo(() => ({
    licensedSeats: filtered.reduce((sum, item) => sum + item.seatLimit, 0),
    usedSeats: filtered.reduce((sum, item) => sum + item.seatsUsed, 0),
    apiEnabled: filtered.filter((item) => item.apiAccess).length,
    atRisk: filtered.filter((item) => item.overageRisk !== 'healthy' || item.status === 'grace').length,
  }), [filtered]);
  async function save(record: LicenseRecord) { await licensingCenterService.save(record); setEditing(null); await load(); setSelectedId(record.id); }
  async function remove(record: LicenseRecord) { await licensingCenterService.remove(record.id); await load(); }
  async function resetAll() { await licensingCenterService.reset(); await load(); }
  async function addSeats(record: LicenseRecord) { await licensingCenterService.save({ ...record, seatLimit: record.seatLimit + 5, overageRisk: 'healthy' }); await load(); }
  async function toggleApi(record: LicenseRecord) { await licensingCenterService.save({ ...record, apiAccess: !record.apiAccess }); await load(); }
  async function sendToGrace(record: LicenseRecord) { await licensingCenterService.save({ ...record, status: record.status === 'grace' ? 'active' : 'grace', overageRisk: record.status === 'grace' ? 'healthy' : 'critical' }); await load(); }

  return <div>
    <PageHeader title="Licensing Center" subtitle="Manage plan entitlements, seat envelopes, and renewal risk before wiring real billing and provisioning." actions={<div className="flex flex-wrap gap-2"><Button onClick={resetAll}>Reset seed data</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `license-${Date.now()}` })}>Add licence</PrimaryButton></div>} />
    <div className="mb-4 grid gap-4 md:grid-cols-4">
      <MetricCard icon={Users} label="Licensed seats" value={String(kpis.licensedSeats)} helper="Total seats available across visible tenants." />
      <MetricCard icon={Users} label="Used seats" value={String(kpis.usedSeats)} helper="Current assigned seats in the SaaS estate." />
      <MetricCard icon={KeyRound} label="API enabled" value={String(kpis.apiEnabled)} helper="Accounts with API access switched on." />
      <MetricCard icon={ShieldAlert} label="At risk" value={String(kpis.atRisk)} helper="Grace-period, overage, or renewal attention." />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" /><Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, plan, notes..." /></div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | LicenseStatus)} options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : item }))} />
        </div>
        <div className="mt-4 space-y-3">
          {filtered.map((row) => <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === row.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${statusTone[row.status]}`}>{row.status}</span><span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${riskTone[row.overageRisk]}`}>{row.overageRisk}</span></div><h3 className="mt-3 text-lg font-semibold text-white">{row.company}</h3><p className="mt-1 text-sm text-textMuted">{row.plan} · {row.seatsUsed}/{row.seatLimit} seats · {row.storesAllowed} stores</p></div><div className="text-right text-xs text-textMuted"><p>Renewal</p><p className="mt-2 font-semibold text-white">{row.renewalDate}</p></div></div>
          </button>)}
        </div>
      </Card>
      <div className="space-y-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Licence spotlight</p>
          {selected ? <div className="mt-4 space-y-4"><div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.company}</h2><p className="mt-2 text-sm text-textMuted">{selected.plan} plan · renewal {selected.renewalDate}</p></div><div className="grid gap-3 sm:grid-cols-2"><Info label="Seats" value={`${selected.seatsUsed}/${selected.seatLimit}`} /><Info label="Stores allowed" value={String(selected.storesAllowed)} /><Info label="API access" value={selected.apiAccess ? 'Enabled' : 'Disabled'} /><Info label="Status" value={selected.status} /></div><p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted">{selected.notes}</p><div className="flex flex-wrap gap-2"><Button onClick={() => setEditing(selected)}>Edit licence</Button><Button onClick={() => addSeats(selected)}>Add 5 seats</Button><Button onClick={() => toggleApi(selected)}>{selected.apiAccess ? 'Disable API' : 'Enable API'}</Button><PrimaryButton onClick={() => sendToGrace(selected)}>{selected.status === 'grace' ? 'Return active' : 'Send to grace'}</PrimaryButton><Button onClick={() => remove(selected)}>Delete</Button></div></div> : <p className="mt-4 text-sm text-textMuted">Select a licence to inspect entitlements and risk.</p>}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Commercial guidance</p>
          <div className="mt-4 space-y-3 text-sm text-textMuted"><p>• Review customers above seat envelope.</p><p>• Use grace before pausing production access.</p><p>• Keep API enablement tied to plan level.</p></div>
        </Card>
      </div>
    </div>
    <LicenseModal record={editing} onClose={() => setEditing(null)} onSave={save} />
  </div>;
}

function LicenseModal({ record, onClose, onSave }: { record: LicenseRecord | null; onClose: () => void; onSave: (record: LicenseRecord) => void | Promise<void> }) {
  const [draft, setDraft] = useState<LicenseRecord | null>(record);
  useEffect(() => setDraft(record), [record]);
  if (!draft) return null;
  return <BaseModal open={Boolean(record)} onClose={onClose} title={draft.company || 'Licence'} description="Manage entitlement and seat rules.">
    <div className="grid gap-3 md:grid-cols-2">
      <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Company" />
      <Input value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} placeholder="Plan" />
      <Input type="number" value={String(draft.seatsUsed)} onChange={(e) => setDraft({ ...draft, seatsUsed: Number(e.target.value) || 0 })} placeholder="Seats used" />
      <Input type="number" value={String(draft.seatLimit)} onChange={(e) => setDraft({ ...draft, seatLimit: Number(e.target.value) || 1 })} placeholder="Seat limit" />
      <Input type="number" value={String(draft.storesAllowed)} onChange={(e) => setDraft({ ...draft, storesAllowed: Number(e.target.value) || 1 })} placeholder="Stores allowed" />
      <Input value={draft.renewalDate} onChange={(e) => setDraft({ ...draft, renewalDate: e.target.value })} placeholder="Renewal date" />
      <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as LicenseStatus })} options={[{ value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'grace', label: 'Grace' }, { value: 'paused', label: 'Paused' }]} />
      <Select value={draft.overageRisk} onChange={(e) => setDraft({ ...draft, overageRisk: e.target.value as LicenseRecord['overageRisk'] })} options={[{ value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
      <Select value={draft.apiAccess ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, apiAccess: e.target.value === 'yes' })} options={[{ value: 'yes', label: 'API enabled' }, { value: 'no', label: 'API disabled' }]} />
      <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" />
    </div>
    <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><PrimaryButton onClick={() => onSave(draft)}>Save licence</PrimaryButton></div>
  </BaseModal>;
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string; helper: string }) { return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p><p className="mt-2 text-sm text-textMuted">{helper}</p></div><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200"><Icon size={18} /></div></div></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>; }
