'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { operationsService } from '@/services/operations.service';
import type { CustomerRecord } from '@/data/operations';

const emptyCustomer: CustomerRecord = { id: '', name: '', organization: '', email: '', segment: 'Retail', status: 'active', spendYtd: 0, projects: 0 };

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [editing, setEditing] = useState<CustomerRecord | null>(null);

  const load = async () => setCustomers(await operationsService.getCustomers());
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => customers.filter((customer) => {
    const matchesSearch = !search || `${customer.name} ${customer.organization} ${customer.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = segment === 'all' || customer.segment === segment;
    return matchesSearch && matchesSegment;
  }), [customers, search, segment]);

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Centralized customer records, segments, and activity." actions={<PrimaryButton onClick={() => setEditing({ ...emptyCustomer, id: `cu-${Date.now()}` })}>Add Customer</PrimaryButton>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Active customers</p><p className="mt-2 text-2xl font-semibold">{customers.filter((item) => item.status === 'active').length}</p></Card>
        <Card><p className="text-xs text-textMuted">Enterprise accounts</p><p className="mt-2 text-2xl font-semibold">{customers.filter((item) => item.segment === 'Enterprise').length}</p></Card>
        <Card><p className="text-xs text-textMuted">Projects</p><p className="mt-2 text-2xl font-semibold">{customers.reduce((sum, item) => sum + item.projects, 0)}</p></Card>
        <Card><p className="text-xs text-textMuted">Spend YTD</p><p className="mt-2 text-2xl font-semibold">${customers.reduce((sum, item) => sum + item.spendYtd, 0).toLocaleString()}</p></Card>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'Retail', 'B2B', 'Enterprise']} value={segment} onChange={(e) => setSegment(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-textMuted">{row.email}</p></div> },
          { key: 'org', header: 'Organization', render: (row) => row.organization },
          { key: 'segment', header: 'Segment', render: (row) => row.segment },
          { key: 'status', header: 'Status', render: (row) => row.status },
          { key: 'projects', header: 'Projects', render: (row) => row.projects },
          { key: 'spend', header: 'Spend YTD', render: (row) => `$${row.spendYtd.toLocaleString()}` },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={async () => { await operationsService.deleteCustomer(row.id); await load(); }}>Delete</Button></div> }
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Customer' : 'Add Customer'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Organization" value={editing.organization} onChange={(e) => setEditing({ ...editing, organization: e.target.value })} />
            <Input placeholder="Email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Select options={['Retail', 'B2B', 'Enterprise']} value={editing.segment} onChange={(e) => setEditing({ ...editing, segment: e.target.value as CustomerRecord['segment'] })} />
            <Select options={['active', 'invited', 'inactive']} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as CustomerRecord['status'] })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Spend YTD" value={String(editing.spendYtd)} onChange={(e) => setEditing({ ...editing, spendYtd: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Projects" value={String(editing.projects)} onChange={(e) => setEditing({ ...editing, projects: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await operationsService.saveCustomer(editing); setEditing(null); await load(); }}>Save Customer</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
