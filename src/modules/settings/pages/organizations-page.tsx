'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { DataTable } from '@/components/data-table/data-table';
import { PlatformEntityModal } from '@/modules/settings/components/platform-entity-modal';
import { platformAdminService } from '@/services/platform-admin.service';
import type { OrganizationRecord } from '@/modules/settings/types';

const emptyForm = { name: '', code: '', status: 'active', primaryContact: '', storefronts: '', collections: '', userGroups: '', billingModel: 'invoice', notes: '' };

export function OrganizationsPage() {
  const [items, setItems] = useState<OrganizationRecord[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRecord | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => { const res = await platformAdminService.listOrganizations(search || undefined); setItems(res.data.items); }, [search]);
  useEffect(() => { void load(); }, [load]);

  const totalCollections = useMemo(() => items.reduce((sum, item) => sum + item.collections.length, 0), [items]);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (item: OrganizationRecord) => { setEditing(item); setForm({ name: item.name, code: item.code, status: item.status, primaryContact: item.primaryContact, storefronts: item.storefronts.join(', '), collections: item.collections.join(', '), userGroups: item.userGroups.join(', '), billingModel: item.billingModel, notes: item.notes }); setOpen(true); };

  const save = async () => {
    const record: OrganizationRecord = {
      id: editing?.id ?? `org-${Date.now()}`,
      name: String(form.name || ''),
      code: String(form.code || ''),
      status: (form.status as OrganizationRecord['status']) || 'active',
      primaryContact: String(form.primaryContact || ''),
      storefronts: String(form.storefronts || '').split(',').map((item) => item.trim()).filter(Boolean),
      collections: String(form.collections || '').split(',').map((item) => item.trim()).filter(Boolean),
      userGroups: String(form.userGroups || '').split(',').map((item) => item.trim()).filter(Boolean),
      billingModel: (form.billingModel as OrganizationRecord['billingModel']) || 'invoice',
      notes: String(form.notes || ''),
      createdAt: editing?.createdAt ?? new Date().toISOString().slice(0, 10)
    };
    await platformAdminService.saveOrganization(record);
    setOpen(false);
    await load();
  };

  return (
    <div>
      <PageHeader title="Organizations" subtitle="Group users, storefront visibility, collections, and billing rules by customer organization." actions={<><Button>Export</Button><PrimaryButton onClick={startCreate}>Add Organization</PrimaryButton></>} />
      <div className="mb-4 grid gap-4 md:grid-cols-3"><MetricCard label="Organizations" value={String(items.length)} /><MetricCard label="Active" value={String(items.filter((item) => item.status === 'active').length)} /><MetricCard label="Collection Links" value={String(totalCollections)} /></div>
      <Card className="mb-4"><Input placeholder="Search organizations..." value={search} onChange={(event) => setSearch(event.target.value)} /></Card>
      <Card>
        <DataTable columns={[
          { key: 'name', header: 'Organization', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.code} · {row.primaryContact}</div></div> },
          { key: 'storefronts', header: 'Storefronts', render: (row) => row.storefronts.join(', ') || '—' },
          { key: 'collections', header: 'Collections', render: (row) => row.collections.join(', ') || '—' },
          { key: 'billing', header: 'Billing', render: (row) => row.billingModel },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={async () => { await platformAdminService.deleteOrganization(row.id); await load(); }}>Delete</Button></div> }
        ]} rows={items} rowKey={(row) => row.id} />
      </Card>
      <PlatformEntityModal open={open} title={editing ? 'Edit Organization' : 'Add Organization'} fields={[
        { key: 'name', label: 'Organization Name' },
        { key: 'code', label: 'Code' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
        { key: 'primaryContact', label: 'Primary Contact' },
        { key: 'storefronts', label: 'Storefronts', placeholder: 'US Main Store, B2B Wholesale API' },
        { key: 'collections', label: 'Collections', placeholder: 'Healthcare Essentials, Corporate Templates' },
        { key: 'userGroups', label: 'User Groups', placeholder: 'Northwind Buyers' },
        { key: 'billingModel', label: 'Billing Model', type: 'select', options: ['invoice', 'card', 'hybrid'] },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add account restrictions, PO requirements, or billing notes...' }
      ]} values={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>; }
