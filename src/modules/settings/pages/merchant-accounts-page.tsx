'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { DataTable } from '@/components/data-table/data-table';
import { PlatformEntityModal } from '@/modules/settings/components/platform-entity-modal';
import { platformAdminService } from '@/services/platform-admin.service';
import type { MerchantAccount } from '@/modules/settings/types';

const emptyForm = { name: '', provider: '', status: 'active', mode: 'live', settlementCurrency: 'USD', merchantId: '', supportedMethods: '', feeProfile: '', payoutSchedule: '', owner: '', notes: '' };

export function MerchantAccountsPage() {
  const [items, setItems] = useState<MerchantAccount[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantAccount | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => { const res = await platformAdminService.listMerchantAccounts(search || undefined); setItems(res.data.items); }, [search]);
  useEffect(() => { void load(); }, [load]);

  const liveCount = useMemo(() => items.filter((item) => item.mode === 'live').length, [items]);

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
  };

  return (
    <div>
      <PageHeader title="Merchant Accounts" subtitle="Manage gateways, settlement routing, payout schedules, and supported payment methods." actions={<><Button>Gateway Health</Button><PrimaryButton onClick={startCreate}>Add Merchant Account</PrimaryButton></>} />
      <div className="mb-4 grid gap-4 md:grid-cols-3"><MetricCard label="Accounts" value={String(items.length)} /><MetricCard label="Live Mode" value={String(liveCount)} /><MetricCard label="Currencies" value={String(new Set(items.map((item) => item.settlementCurrency)).size)} /></div>
      <Card className="mb-4"><Input placeholder="Search merchant accounts..." value={search} onChange={(event) => setSearch(event.target.value)} /></Card>
      <Card>
        <DataTable columns={[
          { key: 'name', header: 'Merchant', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.provider} · {row.merchantId}</div></div> },
          { key: 'mode', header: 'Mode', render: (row) => `${row.mode} · ${row.status}` },
          { key: 'methods', header: 'Methods', render: (row) => row.supportedMethods.join(', ') || '—' },
          { key: 'fees', header: 'Fees', render: (row) => row.feeProfile },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={async () => { await platformAdminService.deleteMerchantAccount(row.id); await load(); }}>Delete</Button></div> }
        ]} rows={items} rowKey={(row) => row.id} />
      </Card>
      <PlatformEntityModal open={open} title={editing ? 'Edit Merchant Account' : 'Add Merchant Account'} fields={[
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
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Capture payout notes, contract info, and fallback behavior...' }
      ]} values={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>; }
