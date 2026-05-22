'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, PackageCheck, Play, Printer, Send, ShieldAlert, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type JobTicket = {
  id: string;
  orderId?: string;
  orderNumber: string;
  artworkUploadId?: string;
  customerName?: string;
  customerEmail?: string;
  productId?: string;
  productName: string;
  quantity: number;
  dueDate: string;
  priority: string;
  status: string;
  artworkStatus: string;
  machine: string;
  material: string;
  route: string[];
  finishing: string[];
  supplier: string;
  notes?: string;
  operatorNotes?: string;
  warnings: string[];
  currentOperator?: string;
  startedAt?: string;
  printCompletedAt?: string;
  packedAt?: string;
  dispatchedAt?: string;
  blockedReason?: string;
  dispatch?: Record<string, any>;
  stageHistory?: Array<{ id: string; from?: string; to: string; action: string; actor: string; note?: string; createdAt: string }>;
};

const actionButtons = [
  { action: 'start-printing', label: 'Start printing', icon: Play },
  { action: 'finish-printing', label: 'Move to finishing', icon: Printer },
  { action: 'start-packing', label: 'Pack / ready dispatch', icon: PackageCheck },
  { action: 'mark-dispatched', label: 'Mark dispatched', icon: Truck },
  { action: 'block', label: 'Block job', icon: ShieldAlert },
  { action: 'unblock', label: 'Unblock', icon: Send },
];

export function ProductionJobDetailPage({ id }: { id: string }) {
  const [job, setJob] = useState<JobTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [operator, setOperator] = useState('');
  const [dispatch, setDispatch] = useState({ carrier: 'DPD', service: 'tracked-24', trackingNumber: '', dock: 'North Dock', destinationZone: 'UK', scanStatus: 'complete' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/internal/config/production-job-tickets/items/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      const item = payload.item || payload.data;
      setJob(item || null);
      if (item?.operatorNotes) setNote(item.operatorNotes);
      if (item?.currentOperator) setOperator(item.currentOperator);
      if (item?.dispatch) setDispatch((current) => ({ ...current, ...item.dispatch }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function savePatch(patch: Record<string, any>) {
    if (!job) return;
    const res = await fetch(`/api/internal/config/production-job-tickets/items/${encodeURIComponent(job.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.ok === false) throw new Error(payload.error || 'Failed to update production job.');
    setJob(payload.item || payload.data);
  }

  async function runAction(action: string) {
    setMessage('');
    try {
      await savePatch({ action, note, actor: operator || 'admin', operator, currentOperator: operator, operatorNotes: note, dispatch });
      setMessage(`Action completed: ${action}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update production job.');
    }
  }

  const statusTone = useMemo(() => {
    if (job?.status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-200';
    if (job?.status === 'dispatched') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  }, [job?.status]);

  if (loading) return <Card>Loading production job…</Card>;
  if (!job) return <Card className="text-red-200">Production job not found.</Card>;

  return (
    <div className="space-y-5">
      <PageHeader title={`Production Job ${job.orderNumber}`} subtitle={`${job.productName} · ${job.quantity} qty · ${job.machine || 'Unassigned'}`} actions={<a href="/production"><Button><ArrowLeft size={14} /> Back to Production</Button></a>} />
      {message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card><p className="text-xs uppercase text-textMuted">Status</p><p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm capitalize ${statusTone}`}>{job.status.replace(/-/g, ' ')}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Artwork</p><p className="mt-2 text-xl font-semibold text-white">{job.artworkStatus}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Due</p><p className="mt-2 text-xl font-semibold text-white">{job.dueDate}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Priority</p><p className="mt-2 text-xl font-semibold capitalize text-white">{job.priority}</p></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-white">Stage updates</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Operator name" />
            <Input value={job.material || ''} onChange={(e) => savePatch({ material: e.target.value }).catch((error) => setMessage(error.message))} placeholder="Material" />
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Operator note / reason for action" className="mt-3 min-h-[110px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
          <div className="mt-4 flex flex-wrap gap-2">
            {actionButtons.map(({ action, label, icon: Icon }) => <Button key={action} onClick={() => void runAction(action)}><Icon size={14} /> {label}</Button>)}
          </div>
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">
            Route: {(job.route || []).join(' → ') || 'not set'}<br />
            Finishing: {(job.finishing || []).join(', ') || 'none'}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-white">Dispatch details</h3>
          <div className="grid gap-3">
            <Select value={dispatch.carrier} options={['DHL', 'DPD', 'Royal Mail', 'UPS', 'Other']} onChange={(e) => setDispatch({ ...dispatch, carrier: e.target.value })} />
            <Select value={dispatch.service} options={['next-day', 'tracked-24', 'tracked-48', 'economy', 'same-day', 'collection']} onChange={(e) => setDispatch({ ...dispatch, service: e.target.value })} />
            <Input value={dispatch.trackingNumber || ''} onChange={(e) => setDispatch({ ...dispatch, trackingNumber: e.target.value })} placeholder="Tracking number" />
            <Select value={dispatch.dock} options={['North Dock', 'South Dock', 'Express Cage', 'Front Counter']} onChange={(e) => setDispatch({ ...dispatch, dock: e.target.value })} />
            <Select value={dispatch.destinationZone} options={['UK', 'EU', 'US', 'ROW']} onChange={(e) => setDispatch({ ...dispatch, destinationZone: e.target.value })} />
            <Select value={dispatch.scanStatus} options={['complete', 'partial', 'missing']} onChange={(e) => setDispatch({ ...dispatch, scanStatus: e.target.value })} />
            <PrimaryButton onClick={() => void savePatch({ dispatch, operatorNotes: note, currentOperator: operator })}>Save dispatch info</PrimaryButton>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Job details</h3><div className="space-y-2 text-sm text-textMuted"><p>Order: {job.orderNumber}</p><p>Customer: {job.customerName || '—'} · {job.customerEmail || '—'}</p><p>Product ID: {job.productId || '—'}</p><p>Artwork upload: {job.artworkUploadId || '—'}</p><p>Supplier: {job.supplier || 'internal'}</p><p>Notes: {job.notes || '—'}</p>{job.blockedReason ? <p className="text-red-300">Blocked: {job.blockedReason}</p> : null}</div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Stage history</h3><div className="space-y-2">{(job.stageHistory || []).slice().reverse().map((event) => <div key={event.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted"><p className="font-semibold text-white">{event.action}: {event.from || 'new'} → {event.to}</p><p>{new Date(event.createdAt).toLocaleString()} · {event.actor}</p>{event.note ? <p className="mt-1">{event.note}</p> : null}</div>)}</div></Card>
      </div>
    </div>
  );
}
