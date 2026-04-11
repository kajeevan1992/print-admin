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
import type { OrganizationRecord } from '@/modules/settings/types';

const emptyForm = { name: '', code: '', status: 'active', primaryContact: '', storefronts: '', collections: '', userGroups: '', billingModel: 'invoice', notes: '' };

type ActivationHealth = 'healthy' | 'watch' | 'critical';

function getActivationHealth(item: OrganizationRecord): ActivationHealth {
  const note = item.notes.toLowerCase();
  if (note.includes('risk') || note.includes('blocked') || item.status === 'inactive') return 'critical';
  if (item.storefronts.length <= 1 || note.includes('demo') || note.includes('queue')) return 'watch';
  return 'healthy';
}

function withOwnerFlag(item: OrganizationRecord, flag: string, enabled: boolean) {
  const tags = new Set(item.notes.split('\n').filter(Boolean));
  if (enabled) tags.add(flag);
  else tags.delete(flag);
  return { ...item, notes: Array.from(tags).join('\n') };
}

export function OrganizationsPage() {
  const { session } = useAuth();
  const isOwner = session?.role === 'super_admin';
  const [items, setItems] = useState<OrganizationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'invoice' | 'card' | 'hybrid'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | ActivationHealth>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRecord | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);

  const load = useCallback(async () => {
    const res = await platformAdminService.listOrganizations(search || undefined);
    setItems(res.data.items);
  }, [search]);
  useEffect(() => { void load(); }, [load]);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (billingFilter !== 'all' && item.billingModel !== billingFilter) return false;
    if (healthFilter !== 'all' && getActivationHealth(item) !== healthFilter) return false;
    return true;
  }), [billingFilter, healthFilter, items, statusFilter]);

  useEffect(() => {
    if (!visibleItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0].id);
    }
  }, [selectedId, visibleItems]);

  const selected = visibleItems.find((item) => item.id === selectedId) ?? null;

  const totalCollections = useMemo(() => visibleItems.reduce((sum, item) => sum + item.collections.length, 0), [visibleItems]);
  const liveCount = useMemo(() => visibleItems.filter((item) => item.status === 'active').length, [visibleItems]);
  const criticalCount = useMemo(() => visibleItems.filter((item) => getActivationHealth(item) === 'critical').length, [visibleItems]);

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (item: OrganizationRecord) => {
    setEditing(item);
    setForm({ name: item.name, code: item.code, status: item.status, primaryContact: item.primaryContact, storefronts: item.storefronts.join(', '), collections: item.collections.join(', '), userGroups: item.userGroups.join(', '), billingModel: item.billingModel, notes: item.notes });
    setOpen(true);
  };

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
    setSelectedId(record.id);
  };

  const saveAndReload = async (record: OrganizationRecord) => {
    await platformAdminService.saveOrganization(record);
    await load();
    setSelectedId(record.id);
  };

  return (
    <div>
      <PageHeader
        title={isOwner ? 'Store Activations' : 'Organizations'}
        subtitle={isOwner ? 'Manage tenant launch groups, activation readiness, demo packs, and deployment state before wiring real SaaS orchestration.' : 'Group users, storefront visibility, collections, and billing rules by customer organization.'}
        actions={<><Button>{isOwner ? 'Launch Checklist' : 'Export'}</Button><PrimaryButton onClick={startCreate}>{isOwner ? 'Add Activation Group' : 'Add Organization'}</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label={isOwner ? 'Activation groups' : 'Organizations'} value={String(visibleItems.length)} />
        <MetricCard label={isOwner ? 'Live tenants' : 'Active'} value={String(liveCount)} />
        <MetricCard label={isOwner ? 'Launch packs' : 'Collection links'} value={String(totalCollections)} />
        <MetricCard label={isOwner ? 'Needs attention' : 'Inactive'} value={String(isOwner ? criticalCount : visibleItems.filter((item) => item.status === 'inactive').length)} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="grid gap-3 md:grid-cols-4">
            <Input placeholder={isOwner ? 'Search tenant, storefront, or billing model...' : 'Search organizations...'} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <Select value={billingFilter} onChange={(event) => setBillingFilter(event.target.value as typeof billingFilter)} options={[{ value: 'all', label: isOwner ? 'All commercial models' : 'All billing' }, { value: 'invoice', label: 'Invoice' }, { value: 'card', label: 'Card' }, { value: 'hybrid', label: 'Hybrid' }]} />
            <Select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value as typeof healthFilter)} options={[{ value: 'all', label: isOwner ? 'All activation health' : 'All records' }, { value: 'healthy', label: 'Healthy' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
          </Card>

          <Card>
            <DataTable columns={[
              { key: 'name', header: isOwner ? 'Activation Group' : 'Organization', render: (row) => <button type="button" className="text-left" onClick={() => setSelectedId(row.id)}><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.code} · {row.primaryContact}</div></button>, className: 'w-[240px]' },
              { key: 'storefronts', header: isOwner ? 'Stores' : 'Storefronts', render: (row) => row.storefronts.join(', ') || '—' },
              { key: 'collections', header: isOwner ? 'Launch Packs' : 'Collections', render: (row) => row.collections.join(', ') || '—' },
              { key: 'billing', header: isOwner ? 'Commercial Model' : 'Billing', render: (row) => row.billingModel },
              { key: 'health', header: isOwner ? 'Health' : 'Status', render: (row) => <HealthPill value={isOwner ? getActivationHealth(row) : row.status === 'active' ? 'healthy' : 'critical'} /> },
              { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button onClick={() => startEdit(row)}>Edit</Button>{isOwner ? <Button onClick={() => void saveAndReload({ ...withOwnerFlag(row, '[READY_FOR_LAUNCH]', true), status: 'active' })}>Launch ready</Button> : null}<Button onClick={async () => { await platformAdminService.deleteOrganization(row.id); await load(); }}>Delete</Button></div> }
            ]} rows={visibleItems} rowKey={(row) => row.id} />
          </Card>
        </div>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">{isOwner ? 'Activation spotlight' : 'Organization spotlight'}</p>
            <p className="mt-2 text-lg font-semibold">{selected?.name ?? 'Nothing selected'}</p>
            <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.code} · ${selected.primaryContact}` : 'Pick a record to inspect account readiness, launch packs, and commercial setup.'}</p>
          </div>
          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MetricCard label={isOwner ? 'Activation health' : 'Status'} value={isOwner ? getActivationHealth(selected) : selected.status} compact />
                <MetricCard label={isOwner ? 'Storefronts' : 'Stores'} value={String(selected.storefronts.length)} compact />
                <MetricCard label={isOwner ? 'Launch packs' : 'Collections'} value={String(selected.collections.length)} compact />
                <MetricCard label={isOwner ? 'Billing model' : 'Billing model'} value={selected.billingModel} compact />
              </div>
              <div className="rounded-2xl border border-white/8 bg-panelMuted/60 p-4">
                <p className="text-xs uppercase tracking-wide text-textMuted">{isOwner ? 'Owner actions' : 'Notes'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void saveAndReload(withOwnerFlag({ ...selected, status: 'active' }, '[READY_FOR_LAUNCH]', true))}>Mark launch ready</Button>
                  <Button onClick={() => void saveAndReload(withOwnerFlag({ ...selected, status: 'active' }, '[LIVE_STORE]', true))}>Activate live</Button>
                  <Button onClick={() => void saveAndReload(withOwnerFlag(selected, '[DEMO_PACK]', true))}>Upload demo pack</Button>
                  <Button onClick={() => void saveAndReload(withOwnerFlag(selected, '[DEPLOYMENT_QUEUED]', true))}>Queue deployment</Button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-panelMuted/60 p-4 text-sm text-textMuted">
                <p className="mb-2 text-xs uppercase tracking-wide">{isOwner ? 'Readiness notes' : 'Notes'}</p>
                <p>{selected.notes || (isOwner ? 'No owner notes yet. Add launch blockers, demo instructions, or deployment constraints from edit mode.' : 'No notes recorded.')}</p>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <PlatformEntityModal open={open} title={editing ? (isOwner ? 'Edit Activation Group' : 'Edit Organization') : (isOwner ? 'Add Activation Group' : 'Add Organization')} fields={[
        { key: 'name', label: 'Organization Name' },
        { key: 'code', label: 'Code' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
        { key: 'primaryContact', label: 'Primary Contact' },
        { key: 'storefronts', label: 'Storefronts', placeholder: 'US Main Store, B2B Wholesale API' },
        { key: 'collections', label: 'Collections', placeholder: 'Healthcare Essentials, Corporate Templates' },
        { key: 'userGroups', label: 'User Groups', placeholder: 'Northwind Buyers' },
        { key: 'billingModel', label: 'Billing Model', type: 'select', options: ['invoice', 'card', 'hybrid'] },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add launch blockers, PO requirements, or billing notes...' }
      ]} values={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onClose={() => setOpen(false)} onSubmit={() => { void save(); }} />
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <Card className={compact ? 'p-4' : ''}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>;
}

function HealthPill({ value }: { value: ActivationHealth | 'healthy' | 'critical' | 'watch' }) {
  const tone = value === 'healthy' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' : value === 'watch' ? 'bg-amber-500/15 text-amber-300 border-amber-400/20' : 'bg-rose-500/15 text-rose-300 border-rose-400/20';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tone}`}>{value}</span>;
}
