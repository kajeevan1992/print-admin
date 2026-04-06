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
import type { QuoteRecord } from '@/data/operations';

const emptyQuote: QuoteRecord = { id: '', customer: '', title: '', channel: 'US Main Store', status: 'draft', total: 0, updatedAt: '' };

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<QuoteRecord | null>(null);

  const load = async () => setQuotes(await operationsService.getQuotes());
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => quotes.filter((quote) => {
    const matchesSearch = !search || `${quote.customer} ${quote.title} ${quote.channel}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || quote.status === status;
    return matchesSearch && matchesStatus;
  }), [quotes, search, status]);

  return (
    <div className="space-y-4">
      <PageHeader title="Quotations" subtitle="Manage quote lifecycle, approvals, and conversion." actions={<PrimaryButton onClick={() => setEditing({ ...emptyQuote, id: `qt-${Date.now()}`, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') })}>Add Quote</PrimaryButton>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-xs text-textMuted">Open quotes</p><p className="mt-2 text-2xl font-semibold">{quotes.filter((item) => item.status === 'draft' || item.status === 'sent').length}</p></Card>
        <Card><p className="text-xs text-textMuted">Approved value</p><p className="mt-2 text-2xl font-semibold">${quotes.filter((item) => item.status === 'approved').reduce((sum, item) => sum + item.total, 0).toLocaleString()}</p></Card>
        <Card><p className="text-xs text-textMuted">Expiring soon</p><p className="mt-2 text-2xl font-semibold">{quotes.filter((item) => item.status === 'expired').length}</p></Card>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'draft', 'sent', 'approved', 'expired']} value={status} onChange={(e) => setStatus(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: 'id', header: 'Id', render: (row) => row.id },
          { key: 'customer', header: 'Customer', render: (row) => <div><p className="font-medium">{row.customer}</p><p className="text-xs text-textMuted">{row.channel}</p></div> },
          { key: 'title', header: 'Quote', render: (row) => row.title },
          { key: 'status', header: 'Status', render: (row) => <span className="rounded-full border border-border px-2 py-1 text-xs uppercase">{row.status}</span> },
          { key: 'total', header: 'Total', render: (row) => `$${row.total.toLocaleString()}` },
          { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={async () => { await operationsService.deleteQuote(row.id); await load(); }}>Delete</Button></div> }
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Quote' : 'Add Quote'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Customer" value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} />
            <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Select options={['US Main Store', 'B2B Wholesale API']} value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value })} />
            <Select options={['draft', 'sent', 'approved', 'expired']} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as QuoteRecord['status'] })} />
            <Input type="number" placeholder="Total" value={String(editing.total)} onChange={(e) => setEditing({ ...editing, total: Number(e.target.value) || 0 })} />
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await operationsService.saveQuote({ ...editing, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') }); setEditing(null); await load(); }}>Save Quote</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
