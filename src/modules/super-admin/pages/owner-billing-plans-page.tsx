
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerBillingPlanRecord, OwnerBillingPlanStatus, OwnerBillingPlanTier } from '@/data/owner-billing-plans';
import { ownerBillingPlansService } from '@/services/owner-billing-plans.service';

type StatusFilter = 'all' | OwnerBillingPlanStatus;
type TierFilter = 'all' | OwnerBillingPlanTier;

const emptyRecord: OwnerBillingPlanRecord = {
  id: '',
  name: '',
  tier: 'starter',
  status: 'draft',
  monthlyPrice: 0,
  annualPrice: 0,
  seatLimit: 0,
  storefrontLimit: 0,
  apiLimit: 0,
  owner: '',
  notes: ''
};

export function OwnerBillingPlansPage() {
  const [rows, setRows] = useState<OwnerBillingPlanRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [editing, setEditing] = useState<OwnerBillingPlanRecord | null>(null);

  async function load() {
    const data = await ownerBillingPlansService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.name, row.tier, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesTier = tier === 'all' || row.tier === tier;
    return matchesQuery && matchesStatus && matchesTier;
  }), [rows, search, status, tier]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerBillingPlanRecord) {
    await ownerBillingPlansService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Billing Plans"
        subtitle="Manage SaaS pricing plans, entitlements, and commercial packaging before wiring real subscriptions and invoicing."
        actions={<><Button onClick={() => ownerBillingPlansService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `plan-${Date.now()}` })}>New Plan</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-billing-plans-search" name="ownerBillingPlansSearch" placeholder="Search plan, tier, owner, || notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-billing-plans-status" name="ownerBillingPlansStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'retired', label: 'Retired' }]} />
        <Select id="owner-billing-plans-tier" name="ownerBillingPlansTier" value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} options={[{ value: 'all', label: 'All tiers' }, { value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed commercial plans</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.name}</p>
                    <p className="text-xs text-textMuted">{row.tier} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">${row.monthlyPrice}/mo · ${row.annualPrice}/yr</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No billing plans match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Plan spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tier" value={selected.tier} />
                <MiniStat label="Monthly" value={`$${selected.monthlyPrice}`} />
                <MiniStat label="Annual" value={`$${selected.annualPrice}`} />
                <MiniStat label="Seat limit" value={String(selected.seatLimit)} />
                <MiniStat label="Storefront limit" value={String(selected.storefrontLimit)} />
                <MiniStat label="API limit" value={String(selected.apiLimit)} />
                <MiniStat label="Owner" value={selected.owner} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Activate</Button>
                  <Button onClick={() => save({ ...selected, status: 'retired' })}>Retire</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Plan</Button>
                  <Button onClick={async () => { await ownerBillingPlansService.delete(selected.id); await load(); }}>Delete Plan</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a billing plan to review entitlements.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model pricing, packaging, and entitlement rules before wiring real subscription management.</p>
              <p>This is the right future surface for discounts, contract terms, overages, and billing migrations.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerBillingPlanRecord; onClose: () => void; onSave: (value: OwnerBillingPlanRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerBillingPlanRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner billing plan' : 'New owner billing plan'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-plan-name" name="ownerPlanName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Plan name" />
          <Input id="owner-plan-owner" name="ownerPlanOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Select id="owner-plan-tier" name="ownerPlanTier" value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value as OwnerBillingPlanTier })} options={[{ value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} />
          <Select id="owner-plan-status" name="ownerPlanStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerBillingPlanStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'retired', label: 'Retired' }]} />
          <Input id="owner-plan-monthly" name="ownerPlanMonthly" type="number" value={String(draft.monthlyPrice)} onChange={(e) => setDraft({ ...draft, monthlyPrice: Number(e.target.value) || 0 })} placeholder="Monthly price" />
          <Input id="owner-plan-annual" name="ownerPlanAnnual" type="number" value={String(draft.annualPrice)} onChange={(e) => setDraft({ ...draft, annualPrice: Number(e.target.value) || 0 })} placeholder="Annual price" />
          <Input id="owner-plan-seats" name="ownerPlanSeats" type="number" value={String(draft.seatLimit)} onChange={(e) => setDraft({ ...draft, seatLimit: Number(e.target.value) || 0 })} placeholder="Seat limit" />
          <Input id="owner-plan-storefronts" name="ownerPlanStorefronts" type="number" value={String(draft.storefrontLimit)} onChange={(e) => setDraft({ ...draft, storefrontLimit: Number(e.target.value) || 0 })} placeholder="Storefront limit" />
          <Input id="owner-plan-api" name="ownerPlanApi" type="number" value={String(draft.apiLimit)} onChange={(e) => setDraft({ ...draft, apiLimit: Number(e.target.value) || 0 })} placeholder="API limit" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-plan-notes"
            name="ownerPlanNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Plan</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
