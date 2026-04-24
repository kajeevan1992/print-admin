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

const statusOptions: QuoteRecord['status'][] = ['draft', 'sent', 'approved', 'expired'];
const channelOptions = ['US Main Store', 'B2B Wholesale API', 'Enterprise Portal'];

const emptyQuote: QuoteRecord = {
  id: '',
  customer: '',
  title: '',
  channel: 'US Main Store',
  status: 'draft',
  total: 0,
  updatedAt: ''
};

const statusLabel: Record<QuoteRecord['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  expired: 'Expired'
};

const statusTone: Record<QuoteRecord['status'], string> = {
  draft: 'border-white/10 bg-white/5 text-text',
  sent: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  expired: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

function money(value: number) {
  return `$${value.toLocaleString()}`;
}

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | QuoteRecord['status']>('all');
  const [channel, setChannel] = useState<'all' | string>('all');
  const [editing, setEditing] = useState<QuoteRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const items = await operationsService.getQuotes();
    setQuotes(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () =>
      quotes.filter((quote) => {
        const haystack = `${quote.id} ${quote.customer} ${quote.title} ${quote.channel}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search.toLowerCase());
        const matchesStatus = status === 'all' || quote.status === status;
        const matchesChannel = channel === 'all' || quote.channel === channel;
        return matchesSearch && matchesStatus && matchesChannel;
      }),
    [quotes, search, status, channel]
  );

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const grouped = useMemo(
    () =>
      statusOptions.map((groupStatus) => ({
        status: groupStatus,
        items: rows.filter((item) => item.status === groupStatus)
      })),
    [rows]
  );

  const kpis = useMemo(() => {
    const draftValue = rows.filter((item) => item.status === 'draft').reduce((sum, item) => sum + item.total, 0);
    const sentValue = rows.filter((item) => item.status === 'sent').reduce((sum, item) => sum + item.total, 0);
    const approvedValue = rows.filter((item) => item.status === 'approved').reduce((sum, item) => sum + item.total, 0);
    return {
      openCount: rows.filter((item) => item.status === 'draft' || item.status === 'sent').length,
      draftValue,
      sentValue,
      approvedValue,
      avgValue: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.total, 0) / rows.length) : 0
    };
  }, [rows]);

  async function saveQuote(quote: QuoteRecord) {
    await operationsService.saveQuote({ ...quote, updatedAt: timestamp() });
    await load();
  }

  async function patchQuote(id: string, patch: Partial<QuoteRecord>) {
    const current = quotes.find((item) => item.id === id);
    if (!current) return;
    await saveQuote({ ...current, ...patch });
  }

  async function duplicateQuote(quote: QuoteRecord) {
    const copy: QuoteRecord = {
      ...quote,
      id: `qt-${Date.now()}`,
      title: `${quote.title} Copy`,
      status: 'draft',
      updatedAt: timestamp()
    };
    await saveQuote(copy);
    setSelectedId(copy.id);
  }

  const exportQuotes = () => {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quotes-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quote Desk"
        subtitle="Manage quote pipeline, approvals, and commercial follow-up in one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportQuotes}>Export JSON</Button>
            <PrimaryButton
              onClick={() =>
                setEditing({
                  ...emptyQuote,
                  id: `qt-${Date.now()}`,
                  updatedAt: timestamp()
                })
              }
            >
              New Quote
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs text-textMuted">Open quotes</p><p className="mt-2 text-2xl font-semibold">{kpis.openCount}</p></Card>
        <Card><p className="text-xs text-textMuted">Draft value</p><p className="mt-2 text-2xl font-semibold">{money(kpis.draftValue)}</p></Card>
        <Card><p className="text-xs text-textMuted">Sent value</p><p className="mt-2 text-2xl font-semibold">{money(kpis.sentValue)}</p></Card>
        <Card><p className="text-xs text-textMuted">Approved value</p><p className="mt-2 text-2xl font-semibold">{money(kpis.approvedValue)}</p></Card>
        <Card><p className="text-xs text-textMuted">Average quote</p><p className="mt-2 text-2xl font-semibold">{money(kpis.avgValue)}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
            <Input placeholder="Search quotes, customer, || channel..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select options={['all', ...statusOptions]} value={status} onChange={(e) => setStatus(e.target.value as 'all' | QuoteRecord['status'])} />
            <Select options={['all', ...channelOptions]} value={channel} onChange={(e) => setChannel(e.target.value)} />
          </div>

          <div className="grid gap-3 xl:grid-cols-4">
            {grouped.map((group) => (
              <div key={group.status} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-textMuted">{statusLabel[group.status]}</p>
                    <p className="mt-1 text-lg font-semibold">{group.items.length}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone[group.status]}`}>{money(group.items.reduce((sum, item) => sum + item.total, 0))}</span>
                </div>
                <div className="space-y-2">
                  {group.items.length ? group.items.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => setSelectedId(quote.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === quote.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-panel/60 hover:border-white/15'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{quote.title}</p>
                          <p className="mt-1 text-xs text-textMuted">{quote.customer}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${statusTone[quote.status]}`}>{statusLabel[quote.status]}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-textMuted">
                        <span>{quote.channel}</span>
                        <span>{money(quote.total)}</span>
                      </div>
                    </button>
                  )) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No quotes in this stage.</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Quote spotlight</p>
            <h3 className="mt-2 text-xl font-semibold text-text">{selected?.title ?? 'No quote selected'}</h3>
            <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.customer} · ${selected.channel}` : 'Pick a quote to review pricing, status, and next action.'}</p>
          </div>

          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Quote ID</p><p className="mt-1 font-medium">{selected.id}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Last updated</p><p className="mt-1 font-medium">{selected.updatedAt}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Commercial value</p><p className="mt-1 font-medium">{money(selected.total)}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Status</p><p className="mt-1 font-medium">{statusLabel[selected.status]}</p></div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setEditing(selected)}>Edit</Button>
                  <Button onClick={() => duplicateQuote(selected)}>Duplicate</Button>
                  <Button onClick={() => patchQuote(selected.id, { status: 'sent' })}>Send</Button>
                  <Button onClick={() => patchQuote(selected.id, { status: 'approved' })}>Approve</Button>
                  <Button onClick={() => patchQuote(selected.id, { status: 'expired' })}>Expire</Button>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">
                Recommended next step: {selected.status === 'draft' ? 'finalise pricing and send to customer.' : selected.status === 'sent' ? 'follow up and convert to approved order.' : selected.status === 'approved' ? 'handoff to order creation and production.' : 're-open || duplicate for a refreshed quote.'}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-textMuted">No quote matches the current filters.</div>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Quote register</p>
            <h3 className="mt-1 text-lg font-semibold text-text">Detailed list view</h3>
          </div>
          <p className="text-sm text-textMuted">{rows.length} visible quotes</p>
        </div>
        <DataTable
          columns={[
            { key: 'id', header: 'Id', render: (row) => row.id },
            { key: 'customer', header: 'Customer', render: (row) => <div><p className="font-medium">{row.customer}</p><p className="text-xs text-textMuted">{row.channel}</p></div> },
            { key: 'title', header: 'Quote', render: (row) => row.title },
            { key: 'status', header: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-xs uppercase ${statusTone[row.status]}`}>{row.status}</span> },
            { key: 'total', header: 'Total', render: (row) => money(row.total) },
            { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><Button onClick={() => setSelectedId(row.id)}>View</Button><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={() => duplicateQuote(row)}>Duplicate</Button><Button onClick={async () => { await operationsService.deleteQuote(row.id); await load(); }}>Delete</Button></div> }
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />
      </Card>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Quote Editor' : 'New Quote'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Customer" value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} />
            <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Select options={channelOptions} value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value })} />
            <Select options={statusOptions} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as QuoteRecord['status'] })} />
            <Input type="number" placeholder="Total" value={String(editing.total)} onChange={(e) => setEditing({ ...editing, total: Number(e.target.value) || 0 })} />
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await saveQuote(editing); setEditing(null); }}>Save Quote</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
