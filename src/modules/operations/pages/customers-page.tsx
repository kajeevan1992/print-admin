'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Copy, Download, Mail, RefreshCcw, Search, Sparkles, Users } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { operationsService } from '@/services/operations.service';
import { customersMock, type CustomerRecord } from '@/data/operations';

const emptyCustomer: CustomerRecord = { id: '', name: '', organization: '', email: '', segment: 'Retail', status: 'active', spendYtd: 0, projects: 0 };
const STORAGE_KEY = 'admin_customers_store';

function healthBand(customer: CustomerRecord) {
  if (customer.status !== 'active') return 'Needs activation';
  if (customer.segment === 'Enterprise' && customer.spendYtd >= 20000) return 'Strategic';
  if (customer.projects >= 5 || customer.spendYtd >= 10000) return 'Growing';
  return 'Stable';
}

function riskBand(customer: CustomerRecord) {
  if (customer.status === 'inactive') return 'High';
  if (customer.status === 'invited') return 'Medium';
  if (customer.projects === 0 || customer.spendYtd < 2000) return 'Medium';
  return 'Low';
}

function tone(label: string) {
  switch (label) {
    case 'Strategic':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'Growing':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    case 'Stable':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    case 'Needs activation':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'High':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'Medium':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  const load = async () => {
    const next = await operationsService.getCustomers();
    setCustomers(next);
    setSelectedId((current) => current || next[0]?.id || '');
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => customers.filter((customer) => {
    const haystack = `${customer.name} ${customer.organization} ${customer.email}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesSegment = segment === 'all' || customer.segment === segment;
    const matchesStatus = status === 'all' || customer.status === status;
    return matchesSearch && matchesSegment && matchesStatus;
  }), [customers, search, segment, status]);

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const stats = useMemo(() => ({
    active: customers.filter((item) => item.status === 'active').length,
    strategic: customers.filter((item) => healthBand(item) === 'Strategic').length,
    projects: customers.reduce((sum, item) => sum + item.projects, 0),
    spend: customers.reduce((sum, item) => sum + item.spendYtd, 0)
  }), [customers]);

  const saveCurrent = async () => {
    if (!editing) return;
    await operationsService.saveCustomer(editing);
    setEditing(null);
    await load();
  };

  const duplicateCustomer = (customer: CustomerRecord) => {
    setEditing({
      ...customer,
      id: `cu-${Date.now()}`,
      name: `${customer.name} Copy`,
      email: customer.email.replace('@', `+copy@`)
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetSeed = async () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setCustomers(customersMock);
    setSelectedId(customersMock[0]?.id ?? '');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage account health, commercial value, and relationship readiness before CRM and API wiring."
        actions={<>
          <Button onClick={exportJson}><Download size={16} /> Export JSON</Button>
          <Button onClick={resetSeed}><RefreshCcw size={16} /> Reset Seed</Button>
          <PrimaryButton onClick={() => setEditing({ ...emptyCustomer, id: `cu-${Date.now()}` })}>Add Customer</PrimaryButton>
        </>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs uppercase text-textMuted">Active customers</p><p className="mt-2 text-3xl font-semibold text-white">{stats.active}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Strategic accounts</p><p className="mt-2 text-3xl font-semibold text-white">{stats.strategic}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Projects</p><p className="mt-2 text-3xl font-semibold text-white">{stats.projects}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Spend YTD</p><p className="mt-2 text-3xl font-semibold text-white">${stats.spend.toLocaleString()}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <Input className="pl-9" placeholder="Search name, company, || email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select options={['all', 'Retail', 'B2B', 'Enterprise']} value={segment} onChange={(e) => setSegment(e.target.value)} />
          <Select options={['all', 'active', 'invited', 'inactive']} value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <Card>
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Customer',
                render: (row) => (
                  <button className="text-left" onClick={() => setSelectedId(row.id)}>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-textMuted">{row.email}</p>
                  </button>
                )
              },
              { key: 'org', header: 'Organization', render: (row) => row.organization },
              {
                key: 'health',
                header: 'Health',
                render: (row) => <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone(healthBand(row))}`}>{healthBand(row)}</span>
              },
              {
                key: 'risk',
                header: 'Risk',
                render: (row) => <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone(riskBand(row))}`}>{riskBand(row)}</span>
              },
              { key: 'projects', header: 'Projects', render: (row) => row.projects },
              { key: 'spend', header: 'Spend YTD', render: (row) => `$${row.spendYtd.toLocaleString()}` },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setEditing(row)}>Edit</Button>
                    <Button onClick={() => duplicateCustomer(row)}><Copy size={14} /> Duplicate</Button>
                    <Button onClick={async () => { await operationsService.deleteCustomer(row.id); await load(); }}>Delete</Button>
                  </div>
                )
              }
            ]}
            rows={rows}
            rowKey={(row) => row.id}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-textMuted">Account Spotlight</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selected?.organization ?? 'No customer selected'}</h3>
                <p className="mt-1 text-sm text-textMuted">{selected?.name ?? 'Pick a customer from the table'}{selected ? ` · ${selected.email}` : ''}</p>
              </div>
              {selected ? <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone(healthBand(selected))}`}>{healthBand(selected)}</span> : null}
            </div>

            {selected ? (
              <div className="mt-4 space-y-3 text-sm text-textMuted">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase text-textMuted">Segment</p>
                    <p className="mt-2 font-medium text-white">{selected.segment}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase text-textMuted">Status</p>
                    <p className="mt-2 font-medium text-white">{selected.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase text-textMuted">Spend YTD</p>
                    <p className="mt-2 font-medium text-white">${selected.spendYtd.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase text-textMuted">Projects</p>
                    <p className="mt-2 font-medium text-white">{selected.projects}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                  <p className="text-xs uppercase text-textMuted">Relationship Notes</p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-center gap-2"><Building2 size={14} /> {selected.organization} is currently tracked as a {selected.segment} account.</li>
                    <li className="flex items-center gap-2"><Users size={14} /> {selected.projects > 4 ? 'Multi-project account with repeat demand.' : 'Light project volume account with upsell room.'}</li>
                    <li className="flex items-center gap-2"><Sparkles size={14} /> {riskBand(selected) === 'High' ? 'Needs rescue plan and immediate follow-up.' : riskBand(selected) === 'Medium' ? 'Worth monitoring for activation and expansion.' : 'Healthy commercial profile for ongoing retention.'}</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PrimaryButton onClick={() => setEditing(selected)}>Open Account</PrimaryButton>
                  <Button onClick={() => window.location.href = `mailto:${selected.email}`}><Mail size={14} /> Email Customer</Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-white">Customer Ops Guidance</h3>
            <ul className="mt-3 space-y-2 text-sm text-textMuted">
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Use this surface to shape the future CRM/account overview before API and database wiring.</li>
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Strategic accounts should surface into pricing, proofing, and dispatch workflows later.</li>
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">The account spotlight card is designed to become the right-hand customer intelligence panel.</li>
            </ul>
          </Card>
        </div>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Customer Record' : 'Add Customer'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Organization" value={editing.organization} onChange={(e) => setEditing({ ...editing, organization: e.target.value })} />
            <Input placeholder="Email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select options={['Retail', 'B2B', 'Enterprise']} value={editing.segment} onChange={(e) => setEditing({ ...editing, segment: e.target.value as CustomerRecord['segment'] })} />
              <Select options={['active', 'invited', 'inactive']} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as CustomerRecord['status'] })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Spend YTD" value={String(editing.spendYtd)} onChange={(e) => setEditing({ ...editing, spendYtd: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Projects" value={String(editing.projects)} onChange={(e) => setEditing({ ...editing, projects: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={saveCurrent}>Save Customer</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
