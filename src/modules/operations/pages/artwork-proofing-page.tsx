'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Eye, FileWarning, MessageSquareMore, Search, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { operationsService } from '@/services/operations.service';
import type { ArtworkProof } from '@/data/operations';

const statusOrder: ArtworkProof['status'][] = ['awaiting-review', 'changes-requested', 'customer-approval', 'approved'];
const statusLabels: Record<ArtworkProof['status'], string> = {
  'awaiting-review': 'Awaiting Review',
  'changes-requested': 'Changes Requested',
  'customer-approval': 'Customer Approval',
  approved: 'Approved'
};

const emptyProof: ArtworkProof = {
  id: '',
  orderNumber: '',
  customer: '',
  product: '',
  owner: 'Prepress Team',
  status: 'awaiting-review',
  risk: 'low',
  dueDate: '',
  notes: ''
};

function statusTone(status: ArtworkProof['status']) {
  switch (status) {
    case 'awaiting-review':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
    case 'changes-requested':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'customer-approval':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
    case 'approved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

function riskTone(risk: ArtworkProof['risk']) {
  switch (risk) {
    case 'high':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'medium':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

function dueLabel(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (Number.isNaN(diff)) return 'No due date';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

export function ArtworkProofingPage() {
  const [proofs, setProofs] = useState<ArtworkProof[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [risk, setRisk] = useState('all');
  const [editing, setEditing] = useState<ArtworkProof | null>(null);
  const [selected, setSelected] = useState<ArtworkProof | null>(null);

  const load = async () => setProofs(await operationsService.getArtworkProofs());
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => proofs.filter((item) => {
    const haystack = `${item.orderNumber} ${item.customer} ${item.product} ${item.owner} ${item.notes}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = status === 'all' || item.status === status;
    const matchesRisk = risk === 'all' || item.risk === risk;
    return matchesSearch && matchesStatus && matchesRisk;
  }), [proofs, risk, search, status]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((item) => item.status !== 'approved').length,
    customerApproval: filtered.filter((item) => item.status === 'customer-approval').length,
    highRisk: filtered.filter((item) => item.risk === 'high').length
  }), [filtered]);

  const grouped = useMemo(() => Object.fromEntries(statusOrder.map((key) => [key, filtered.filter((item) => item.status === key)])) as Record<ArtworkProof['status'], ArtworkProof[]>, [filtered]);

  const saveEditing = async () => {
    if (!editing) return;
    await operationsService.saveArtworkProof(editing);
    setEditing(null);
    await load();
  };

  const advance = async (item: ArtworkProof) => {
    const next = statusOrder[Math.min(statusOrder.indexOf(item.status) + 1, statusOrder.length - 1)];
    await operationsService.saveArtworkProof({ ...item, status: next });
    await load();
  };

  const requestChanges = async (item: ArtworkProof) => {
    await operationsService.saveArtworkProof({ ...item, status: 'changes-requested' });
    await load();
  };

  const createProof = () => setEditing({
    ...emptyProof,
    id: `ap-${Date.now()}`,
    orderNumber: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artwork Proofing"
        subtitle="Give prepress, customer approval, and revision handling a dedicated surface so proofing stops feeling like hidden admin work."
        actions={<><Button onClick={load}>Refresh</Button><PrimaryButton onClick={createProof}>Add Proof</PrimaryButton></>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs uppercase text-textMuted">Proofs tracked</p><p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Still pending</p><p className="mt-2 text-3xl font-semibold text-white">{stats.pending}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Waiting on customer</p><p className="mt-2 text-3xl font-semibold text-white">{stats.customerApproval}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">High risk</p><p className="mt-2 text-3xl font-semibold text-white">{stats.highRisk}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer, owner, || issue..." />
          </div>
          <Select value={status} options={['all', ...statusOrder]} onChange={(e) => setStatus(e.target.value)} />
          <Select value={risk} options={['all', 'low', 'medium', 'high']} onChange={(e) => setRisk(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-4 xl:grid-cols-2">
          {statusOrder.map((column) => (
            <Card key={column} className="p-0 overflow-hidden">
              <div className="border-b border-white/6 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{statusLabels[column]}</p>
                  <p className="text-xs text-textMuted">{grouped[column].length} items</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(column)}`}>{statusLabels[column]}</span>
              </div>
              <div className="space-y-3 p-3">
                {grouped[column].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-5 text-center text-xs text-textMuted">No proofs here</div>
                ) : grouped[column].map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.orderNumber}</p>
                        <p className="mt-1 text-xs text-textMuted">{item.customer} • {item.product}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone(item.risk)}`}>{item.risk} risk</span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-textMuted">
                      <div className="flex items-center gap-2"><Clock3 size={14} /> <span>{dueLabel(item.dueDate)}</span></div>
                      <div className="flex items-center gap-2"><Eye size={14} /> <span>{item.owner}</span></div>
                      <div className="flex items-center gap-2"><MessageSquareMore size={14} /> <span>{item.notes || 'No notes yet'}</span></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => setSelected(item)}>Open</Button>
                      <Button onClick={() => setEditing(item)}>Edit</Button>
                      <Button onClick={() => requestChanges(item)}>Request changes</Button>
                      <PrimaryButton onClick={() => advance(item)} disabled={item.status === 'approved'}>{item.status === 'approved' ? 'Approved' : 'Advance'}</PrimaryButton>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-base font-semibold text-white">Proofing guidance</h3>
            <ul className="mt-3 space-y-2 text-sm text-textMuted">
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Move risky proofs to customer approval earlier so dispatch dates stay realistic.</li>
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">Use requested-changes as an explicit state so revisions do not disappear into comments.</li>
              <li className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">This page is designed to become the API-backed artwork approval workflow later.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-base font-semibold text-white">Attention summary</h3>
            <div className="mt-3 space-y-3 text-sm text-textMuted">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-white"><FileWarning size={16} /> Files needing revision</div>
                <p className="mt-2 text-3xl font-semibold text-white">{grouped['changes-requested'].length}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-white"><Wand2 size={16} /> Ready for approval</div>
                <p className="mt-2 text-3xl font-semibold text-white">{grouped['customer-approval'].length}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-white"><CheckCircle2 size={16} /> Approved today</div>
                <p className="mt-2 text-3xl font-semibold text-white">{grouped.approved.length}</p>
                {stats.highRisk > 0 ? <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100"><AlertTriangle size={14} /> {stats.highRisk} high-risk proofs still need attention.</p> : null}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.orderNumber}` : 'Edit proof'}>
        {editing ? (
          <div className="space-y-3">
            <Input value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} placeholder="Order number" />
            <Input value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} placeholder="Customer" />
            <Input value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} placeholder="Product" />
            <Input value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} placeholder="Owner" />
            <Select value={editing.status} options={statusOrder} onChange={(e) => setEditing({ ...editing, status: e.target.value as ArtworkProof['status'] })} />
            <Select value={editing.risk} options={['low', 'medium', 'high']} onChange={(e) => setEditing({ ...editing, risk: e.target.value as ArtworkProof['risk'] })} />
            <Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
            <Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes / issue summary" />
            <div className="flex justify-between gap-2">
              <Button onClick={async () => { await operationsService.deleteArtworkProof(editing.id); setEditing(null); await load(); }}>Delete</Button>
              <div className="flex gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={saveEditing}>Save Proof</PrimaryButton></div>
            </div>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.orderNumber} details` : 'Proof details'}>
        {selected ? (
          <div className="space-y-4 text-sm text-textMuted">
            <Card className="bg-white/[0.02]"><div className="grid gap-3 md:grid-cols-2"><div><p className="text-xs uppercase text-textMuted">Customer</p><p className="mt-1 text-white">{selected.customer}</p></div><div><p className="text-xs uppercase text-textMuted">Product</p><p className="mt-1 text-white">{selected.product}</p></div><div><p className="text-xs uppercase text-textMuted">Owner</p><p className="mt-1 text-white">{selected.owner}</p></div><div><p className="text-xs uppercase text-textMuted">Due</p><p className="mt-1 text-white">{dueLabel(selected.dueDate)}</p></div></div></Card>
            <Card className="bg-white/[0.02]"><p className="text-xs uppercase text-textMuted">Current status</p><div className="mt-2 flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(selected.status)}`}>{statusLabels[selected.status]}</span><span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone(selected.risk)}`}>{selected.risk} risk</span></div><p className="mt-3">{selected.notes || 'No issue notes were captured yet.'}</p></Card>
            <div className="flex flex-wrap gap-2"><Button onClick={() => { setEditing(selected); setSelected(null); }}>Edit</Button><Button onClick={() => requestChanges(selected)}>Request changes</Button><PrimaryButton onClick={() => advance(selected)} disabled={selected.status === 'approved'}>{selected.status === 'approved' ? 'Approved' : 'Advance proof'}</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
