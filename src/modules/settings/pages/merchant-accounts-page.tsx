'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { DataTable } from '@/components/data-table/data-table';
import { PlatformEntityModal } from '@/modules/settings/components/platform-entity-modal';
import { platformAdminService } from '@/services/platform-admin.service';
import { useAuth } from '@/lib/auth';
import type { MerchantAccount } from '@/modules/settings/types';

const emptyForm = { name: '', provider: '', status: 'active', mode: 'live', settlementCurrency: 'USD', merchantId: '', supportedMethods: '', feeProfile: '', payoutSchedule: '', owner: '', notes: '' };

type BillingRisk = 'healthy' | 'watch' | 'critical';

function getBillingRisk(item: MerchantAccount): BillingRisk {
  const note = item.notes.toLowerCase();
  if (item.status === 'inactive' || note.includes('chargeback') || note.includes('risk') || note.includes('grace')) return 'critical';
  if (item.mode === 'test' || note.includes('pilot') || item.supportedMethods.length <= 1) return 'watch';
  return 'healthy';
}

function withBillingFlag(item: MerchantAccount, flag: string, enabled: boolean) {
  const tags = new Set(item.notes.split('\n').filter(Boolean));
  if (enabled) tags.add(flag);
  else tags.delete(flag);
  return { ...item, notes: Array.from(tags).join('\n') };
}

export function MerchantAccountsPage() {
  const { session } = useAuth();
  const isOwner = session?.role === 'super_admin';
  const [items, setItems] = useState<MerchantAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'live' | 'test'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | BillingRisk>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantAccount | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => { const res = await platformAdminService.listMerchantAccounts(search || undefined); setItems(res.data.items); }, [search]);
  useEffect(() => { void load(); }, [load]);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (modeFilter !== 'all' && item.mode !== modeFilter) return false;
    if (riskFilter !== 'all' && getBillingRisk(item) !== riskFilter) return false;
    return true;
  }), [items, modeFilter, riskFilter, statusFilter]);

  useEffect(() => {
    if (!visibleItems.length) { setSelectedId(null); return; }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) setSelectedId(visibleItems[0].id);
  }, [selectedId, visibleItems]);

  const selected = visibleItems.find((item) => item.id === selectedId) ?? null;
  const liveCount = useMemo(() => visibleItems.filter((item) => item.mode === 'live').length, [visibleItems]);
  const criticalCount = useMemo(() => visibleItems.filter((item) => getBillingRisk(item) === 'critical').length, [visibleItems]);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (item: MerchantAccount) => { setEditing(item); setForm({ name: item.name, provider: item.provider, status: item.status, mode: item.mode, settlementCurrency: item.settlementCurrency, merchantId: item.merchantId, supportedMethods: item.supportedMethods.join(', '), feeProfile: item.feeProfile, payoutSchedule: item.payoutSchedule, owner: item.owner, notes: item.notes }); setOpen(true); };

  const save = async () => {
    const record: MerchantAccount = {
      id: editing?.id ?? `mer-${Date.now()}`,
      name: String(form.name || ''),
      provider: String(form.provider || ''),
      status: (form.status as MerchantAccount['status']) || 'active',
      mode: (form.mode as MerchantAccount['mode']) || 'live',
      settlementCurrency: String(form.settlementCurrency || 'USD'),
      merchantId: String(form.merchantId || ''),
      supportedMethods: String(form.supportedMethods || '').split(',').map((item) => item.trim()).filter(Boolean),
      feeProfile: String(form.feeProfile || ''),
      payoutSchedule: String(form.payoutSchedule || ''),
      owner: String(form.owner || ''),
      notes: String(form.notes || '')
    };
    await platformAdminService.saveMerchantAccount(record);
    setOpen(false);
    await load();
    setSelectedId(record.id);
  };

  const saveAndReload = async (record: MerchantAccount) => { await platformAdminService.saveMerchantAccount(record); await load(); setSelectedId(record.id); };

  return (
    <div>
      <PageHeader title={isOwner ? 'Billing Ops' : 'Merchant Accounts'} subtitle={isOwner ? 'Manage gateways, settlement routing, payout schedules, grace states, and payment risk across your SaaS customer estate.' : 'Manage gateways, settlement routing, payout schedules, and supported payment methods.'} actions={<><Button>{isOwner ? 'Payout Risk' : 'Gateway Health'}</Button><PrimaryButton onClick={startCreate}>{isOwner ? 'Add Billing Account' : 'Add Merchant Account'}</PrimaryButton></>} />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label={isOwner ? 'Billing accounts' : 'Accounts'} value={String(visibleItems.length)} />
        <MetricCard label={isOwner ? 'Live gateways' : 'Live mode'} value={String(liveCount)} />
        <MetricCard label={isOwner ? 'Currencies' : 'Currencies'} value={String(new Set(visibleItems.map((item) => item.settlementCurrency)).size)} />
        <MetricCard label={isOwner ? 'Payment risk' : 'Inactive'} value={String(isOwner ? criticalCount : visibleItems.filter((item) => item.status === 'inactive').length)} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="grid gap-3 md:grid-cols-4">
            <Input placeholder={isOwner ? 'Search provider, merchant ID, or payout owner...' : 'Search merchant accounts...'} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <Select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as typeof modeFilter)} options={[{ value: 'all', label: 'All modes' }, { value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }]} />
            <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as typeof riskFilter)} options={[{ value: 'all', label: isOwner ? 'All risk' : 'All records' }, { value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
          </Card>

          <Card>
            <DataTable columns={[
              { key: 'name', header: isOwner ? 'Billing Account' : 'Merchant', render: (row) => <button type="button" className="text-left" onClick={() => setSelectedId(row.id)}><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.provider} · {row.merchantId}</div></button>, className: 'w-[240px]' },
              { key: 'mode', header: 'Mode', render: (row) => `${row.mode} · ${row.status}` },
              { key: 'methods', header: 'Methods', render: (row) => row.supportedMethods.join(', ') || '—' },
              { key: 'fees', header: 'Fees', render: (row) => row.feeProfile },
              { key: 'risk', header: isOwner ? 'Risk' : 'State', render: (row) => <HealthPill value={isOwner ? getBillingRisk(row) : row.status === 'active' ? 'healthy' : 'critical'} /> },
              { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button onClick={() => startEdit(row)}>Edit</Button>{isOwner ? <Button onClick={() => void saveAndReload(withBillingFlag(row, '[GRACE_ACCOUNT]', true))}>Grace</Button> : null}<Button onClick={async () => { await platformAdminService.deleteMerchantAccount(row.id); await load(); }}>Delete</Button></div> }
            ]} rows={visibleItems} rowKey={(row) => row.id} />
          </Card>
        </div>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">{isOwner ? 'Billing spotlight' : 'Merchant spotlight'}</p>
            <p className="mt-2 text-lg font-semibold">{selected?.name ?? 'Nothing selected'}</p>
            <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.provider} · ${selected.merchantId}` : 'Select a billing account to inspect payout cadence, payment methods, and risk posture.'}</p>
          </div>
          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MetricCard label="Billing risk" value={getBillingRisk(selected)} compact />
                <MetricCard label="Settlement" value={selected.settlementCurrency} compact />
                <MetricCard label="Methods" value={String(selected.supportedMethods.length)} compact />
                <MetricCard label="Schedule" value={selected.payoutSchedule || '—'} compact />
              </div>
              <div className="rounded-2xl border border-white/8 bg-panelMuted/60 p-4">
                <p className="text-xs uppercase tracking-wide text-textMuted">Owner actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void saveAndReload(withBillingFlag({ ...selected, mode: 'live', status: 'active' }, '[APPROVED]', true))}>Approve live</Button>
                  <Button onClick={() => void saveAndReload(withBillingFlag({ ...selected, status: 'inactive' }, '[PAYOUT_RISK]', true))}>Flag payout risk</Button>
                  <Button onClick={() => void saveAndReload(withBillingFlag({ ...selected, status: 'active' }, '[PAYOUT_RISK]', false))}>Clear risk</Button>
                  <Button onClick={() => void saveAndReload(withBillingFlag({ ...selected, mode: 'test' }, '[PILOT]', true))}>Move to pilot</Button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-panelMuted/60 p-4 text-sm text-textMuted">
                <p className="mb-2 text-xs uppercase tracking-wide">Billing notes</p>
                <p>{selected.notes || 'No billing notes recorded yet. Add chargeback concerns, payout exceptions, or commercial notes from edit mode.'}</p>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <PlatformEntityModal open={open} title={editing ? (isOwner ? 'Edit Billing Account' : 'Edit Merchant Account') : (isOwner ? 'Add Billing Account' : 'Add Merchant Account')} fields={[
        { key: 'name', label: 'Account Name' },
        { key: 'provider', label: 'Provider' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
        { key: 'mode', label: 'Mode', type: 'select', options: ['live', 'test'] },
        { key: 'settlementCurrency', label: 'Settlement Currency' },
        { key: 'merchantId', label: 'Merchant ID' },
        { key: 'supportedMethods', label: 'Supported Methods', placeholder: 'Card, Apple Pay, Invoice' },
        { key: 'feeProfile', label: 'Fee Profile' },
        { key: 'payoutSchedule', label: 'Payout Schedule' },
        { key: 'owner', label: 'Owner' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Capture payout notes, contract info, chargeback risk, and fallback behavior...' }
      ]} values={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} />
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <Card className={compact ? 'p-4' : ''}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold capitalize">{value}</p></Card>;
}

function HealthPill({ value }: { value: BillingRisk | 'healthy' | 'critical' | 'watch' }) {
  const tone = value === 'healthy' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' : value === 'watch' ? 'bg-amber-500/15 text-amber-300 border-amber-400/20' : 'bg-rose-500/15 text-rose-300 border-rose-400/20';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tone}`}>{value}</span>;
}
