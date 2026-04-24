'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { DataTable } from '@/components/data-table/data-table';
import { platformAdminService } from '@/services/platform-admin.service';
import { PlatformEntityModal } from '@/modules/settings/components/platform-entity-modal';
import type { ApiAccessProfile } from '@/modules/settings/types';

const emptyForm = {
  name: '', status: 'draft', owner: '', enabled: false, contact: '', reference: '', reviewCycle: 'Monthly', notes: '', allowedScopes: '', environments: 'production', rateLimitPerMinute: '60', ipAllowList: '', webhookEnabled: false
};

export function ApiAccessPage() {
  const [items, setItems] = useState<ApiAccessProfile[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => {
    const response = await platformAdminService.listApiAccessProfiles(search || undefined);
    setItems(response.data.items);
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const activeCount = useMemo(() => items.filter((item) => item.status === 'active').length, [items]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (item: ApiAccessProfile) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      status: item.status,
      owner: item.owner,
      enabled: item.enabled,
      contact: item.contact,
      reference: item.reference,
      reviewCycle: item.reviewCycle,
      notes: item.notes,
      allowedScopes: item.allowedScopes.join(', '),
      environments: item.environments.join(', '),
      rateLimitPerMinute: String(item.rateLimitPerMinute),
      ipAllowList: item.ipAllowList,
      webhookEnabled: item.webhookEnabled
    });
    setOpen(true);
  };

  const save = async () => {
    const record: ApiAccessProfile = {
      id: editingId ?? `acc-${Date.now()}`,
      name: String(form.name || ''),
      status: (form.status as ApiAccessProfile['status']) || 'draft',
      owner: String(form.owner || ''),
      enabled: Boolean(form.enabled),
      contact: String(form.contact || ''),
      reference: String(form.reference || ''),
      reviewCycle: (form.reviewCycle as ApiAccessProfile['reviewCycle']) || 'Monthly',
      notes: String(form.notes || ''),
      allowedScopes: String(form.allowedScopes || '').split(',').map((item) => item.trim()).filter(Boolean),
      environments: String(form.environments || '').split(',').map((item) => item.trim()).filter(Boolean) as ApiAccessProfile['environments'],
      rateLimitPerMinute: Number(form.rateLimitPerMinute) || 60,
      ipAllowList: String(form.ipAllowList || ''),
      webhookEnabled: Boolean(form.webhookEnabled),
      lastSaved: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    await platformAdminService.saveApiAccessProfile(record);
    setOpen(false);
    await load();
  };

  return (
    <div>
      <PageHeader title="API Access" subtitle="Control access profiles, scope bundles, webhook permissions, and operational review cycles." actions={<><Button>Audit Log</Button><PrimaryButton onClick={startCreate}>Add Access Profile</PrimaryButton></>} />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Profiles" value={String(items.length)} />
        <MetricCard label="Active" value={String(activeCount)} />
        <MetricCard label="Webhooks Enabled" value={String(items.filter((item) => item.webhookEnabled).length)} />
      </div>
      <Card className="mb-4"><Input placeholder="Search API access profiles..." value={search} onChange={(event) => setSearch(event.target.value)} /></Card>
      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'Profile', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.reference} · {row.owner}</div></div> },
            { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
            { key: 'scopes', header: 'Scopes', render: (row) => row.allowedScopes.join(', ') || '—' },
            { key: 'rate', header: 'Rate Limit', render: (row) => `${row.rateLimitPerMinute}/min` },
            { key: 'updated', header: 'Last Saved', render: (row) => row.lastSaved },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={async () => { await platformAdminService.deleteApiAccessProfile(row.id); await load(); }}>Delete</Button></div> }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
      </Card>
      <PlatformEntityModal
        open={open}
        title={editingId ? 'Edit API Access Profile' : 'Add API Access Profile'}
        fields={[
          { key: 'name', label: 'Profile Name' },
          { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'disabled'] },
          { key: 'owner', label: 'Owner' },
          { key: 'contact', label: 'Contact' },
          { key: 'reference', label: 'Reference' },
          { key: 'reviewCycle', label: 'Review Cycle', type: 'select', options: ['Weekly', 'Monthly', 'Quarterly'] },
          { key: 'allowedScopes', label: 'Allowed Scopes', placeholder: 'catalog:read, orders:write' },
          { key: 'environments', label: 'Environments', placeholder: 'production, staging' },
          { key: 'rateLimitPerMinute', label: 'Rate Limit / Minute' },
          { key: 'ipAllowList', label: 'IP Allow List', placeholder: '10.0.0.0/24' },
          { key: 'enabled', label: 'Enabled', type: 'toggle' },
          { key: 'webhookEnabled', label: 'Webhook Enabled', type: 'toggle' },
          { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Document integration notes and restrictions...' }
        ]}
        values={form}
        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
        onClose={() => setOpen(false)}
        onSubmit={() => { void save(); }}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>;
}

function StatusPill({ value }: { value: string }) {
  const tone = value === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : value === 'draft' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-red-500/30 bg-red-500/10 text-red-200';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${tone}`}>{value}</span>;
}
