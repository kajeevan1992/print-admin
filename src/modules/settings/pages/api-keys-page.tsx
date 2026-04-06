'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { DataTable } from '@/components/data-table/data-table';
import { PlatformEntityModal } from '@/modules/settings/components/platform-entity-modal';
import { platformAdminService } from '@/services/platform-admin.service';
import type { ApiKeyRecord } from '@/modules/settings/types';

const emptyForm = { name: '', type: 'public', environment: 'production', status: 'active', owner: '', scopes: '', expiresAt: '', notes: '' };

export function ApiKeysPage() {
  const [items, setItems] = useState<ApiKeyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKeyRecord | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => { const res = await platformAdminService.listApiKeys(search || undefined); setItems(res.data.items); }, [search]);
  useEffect(() => { void load(); }, [load]);

  const activeKeys = useMemo(() => items.filter((item) => item.status === 'active').length, [items]);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (item: ApiKeyRecord) => { setEditing(item); setForm({ name: item.name, type: item.type, environment: item.environment, status: item.status, owner: item.owner, scopes: item.scopes.join(', '), expiresAt: item.expiresAt, notes: item.notes }); setOpen(true); };

  const save = async () => {
    const prefix = `${form.type === 'secret' ? 'sk' : 'pk'}_${form.environment === 'production' ? 'live' : 'test'}_${Math.random().toString(36).slice(2, 6)}`;
    const record: ApiKeyRecord = {
      id: editing?.id ?? `key-${Date.now()}`,
      name: String(form.name || ''),
      type: (form.type as ApiKeyRecord['type']) || 'public',
      environment: (form.environment as ApiKeyRecord['environment']) || 'production',
      status: (form.status as ApiKeyRecord['status']) || 'active',
      prefix: editing?.prefix ?? prefix,
      scopes: String(form.scopes || '').split(',').map((item) => item.trim()).filter(Boolean),
      lastUsedAt: editing?.lastUsedAt ?? 'Never',
      expiresAt: String(form.expiresAt || ''),
      createdAt: editing?.createdAt ?? new Date().toISOString().slice(0, 10),
      owner: String(form.owner || ''),
      notes: String(form.notes || '')
    };
    await platformAdminService.saveApiKey(record);
    setOpen(false);
    await load();
  };

  return (
    <div>
      <PageHeader title="API Keys" subtitle="Generate, rotate, and revoke credentials used by storefronts, integrations, and back-office automation." actions={<><Button>Export Key Log</Button><PrimaryButton onClick={startCreate}>Generate Key</PrimaryButton></>} />
      <div className="mb-4 grid gap-4 md:grid-cols-3"><MetricCard label="Total Keys" value={String(items.length)} /><MetricCard label="Active" value={String(activeKeys)} /><MetricCard label="Restricted" value={String(items.filter((item) => item.status === 'restricted').length)} /></div>
      <Card className="mb-4"><Input placeholder="Search API keys..." value={search} onChange={(event) => setSearch(event.target.value)} /></Card>
      <Card>
        <DataTable columns={[
          { key: 'name', header: 'Key', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.prefix}</div></div> },
          { key: 'type', header: 'Type', render: (row) => `${row.type} · ${row.environment}` },
          { key: 'scopes', header: 'Scopes', render: (row) => row.scopes.join(', ') || '—' },
          { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
          { key: 'lastUsed', header: 'Last Used', render: (row) => row.lastUsedAt },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => navigator.clipboard?.writeText(row.prefix)}>Copy Prefix</Button><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={async () => { await platformAdminService.deleteApiKey(row.id); await load(); }}>Delete</Button></div> }
        ]} rows={items} rowKey={(row) => row.id} />
      </Card>
      <PlatformEntityModal open={open} title={editing ? 'Edit API Key' : 'Generate API Key'} fields={[
        { key: 'name', label: 'Key Name' },
        { key: 'type', label: 'Type', type: 'select', options: ['public', 'secret'] },
        { key: 'environment', label: 'Environment', type: 'select', options: ['production', 'staging', 'development'] },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'restricted'] },
        { key: 'owner', label: 'Owner' },
        { key: 'scopes', label: 'Scopes', placeholder: 'catalog:read, orders:write' },
        { key: 'expiresAt', label: 'Expires At', placeholder: '2026-12-31' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Document key purpose and rotation notes...' }
      ]} values={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>; }
function StatusPill({ value }: { value: string }) { const tone = value === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : value === 'restricted' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-red-500/30 bg-red-500/10 text-red-200'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${tone}`}>{value}</span>; }
