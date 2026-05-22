'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';
import { Input } from '@/components/forms/input';
import { ordersService } from '@/services/orders.service';
import type { Order, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

const tabs = ['Summary', 'Items', 'Artwork', 'Production', 'Notes', 'Activity'];

type ArtworkReviewStatus = 'pending-review' | 'approved' | 'rejected' | 'replacement-requested';

type ArtworkUpload = {
  id: string;
  productId?: string;
  orderId?: string;
  quoteId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  widthMm?: number;
  heightMm?: number;
  pdfHints?: any;
  fileUrl: string;
  downloadUrl: string;
  preflight?: any;
  reviewStatus?: ArtworkReviewStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  replacementRequestedAt?: string;
  approvalHistory?: Array<{ id: string; action: ArtworkReviewStatus; actor: string; note?: string; createdAt: string }>;
  createdAt: string;
};

function formatSize(bytes?: number) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

function statusTone(status?: string) {
  if (status === 'approved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'rejected' || status === 'replacement-requested') return 'border-red-500/30 bg-red-500/10 text-red-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

export function OrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [artworkUploads, setArtworkUploads] = useState<ArtworkUpload[]>([]);
  const [artworkLoading, setArtworkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ordersService.getOrder(id);
      setOrder(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadArtwork = useCallback(async (currentOrder: Order) => {
    setArtworkLoading(true);
    try {
      const productIds = (currentOrder.items || []).map((item) => item.productId).filter(Boolean).join(',');
      const params = new URLSearchParams({ orderId: currentOrder.id });
      if (productIds) params.set('productIds', productIds);
      const res = await fetch(`/api/internal/storefront/artwork/uploads?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      setArtworkUploads(Array.isArray(payload?.data?.items) ? payload.data.items : []);
    } finally {
      setArtworkLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (order) void loadArtwork(order); }, [order, loadArtwork]);

  const artworkStats = useMemo(() => ({
    total: artworkUploads.length,
    blocked: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'blocked').length,
    warning: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'warning').length,
    passed: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'passed').length,
    approved: artworkUploads.filter((item) => item.reviewStatus === 'approved').length,
    pending: artworkUploads.filter((item) => !item.reviewStatus || item.reviewStatus === 'pending-review').length,
  }), [artworkUploads]);

  async function updateArtworkStatus(upload: ArtworkUpload, action: ArtworkReviewStatus) {
    if (!order) return;
    setReviewingId(upload.id);
    try {
      const res = await fetch(`/api/internal/storefront/artwork/uploads/${upload.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: reviewNote, actor: 'admin', orderId: order.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Artwork status update failed');
      setArtworkUploads((current) => current.map((item) => item.id === upload.id ? payload.upload : item));
      setReviewNote('');
      if (action === 'approved' && order.productionStage === 'prepress') setOrder((await ordersService.updateProductionStage(order.id, 'proofing')).data);
      if (action === 'replacement-requested') setOrder((await ordersService.addNote(order.id, `Artwork replacement requested for ${upload.originalName}${reviewNote ? `: ${reviewNote}` : ''}`)).data);
      if (action === 'rejected') setOrder((await ordersService.addNote(order.id, `Artwork rejected for ${upload.originalName}${reviewNote ? `: ${reviewNote}` : ''}`)).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork status update failed');
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <Card>Loading order...</Card>;
  if (error || !order) return <Card className="text-red-200">{error ?? 'Order not found'}</Card>;

  const updateStatus = async (status: OrderStatus) => setOrder((await ordersService.updateOrderStatus(order.id, status)).data);
  const updatePayment = async (paymentStatus: PaymentStatus) => setOrder((await ordersService.updatePaymentStatus(order.id, paymentStatus)).data);
  const updateProduction = async (productionStage: ProductionStage) => setOrder((await ordersService.updateProductionStage(order.id, productionStage)).data);
  const addNote = async () => {
    if (!note.trim()) return;
    setOrder((await ordersService.addNote(order.id, note)).data);
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${order.customerName} · ${order.organizationName} · ${order.storeName}`}
        actions={<><Button>Download Proof</Button><PrimaryButton>Open Production Job</PrimaryButton></>}
      />
      {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <MetricCard label="Total" value={`${order.currency} ${order.total.toLocaleString()}`} />
        <MetricCard label="Status" value={order.status.replace(/-/g, ' ')} />
        <MetricCard label="Artwork" value={artworkStats.approved ? `${artworkStats.approved}/${artworkStats.total} approved` : artworkStats.blocked ? `${artworkStats.blocked} blocked` : artworkStats.warning ? `${artworkStats.warning} warnings` : artworkStats.total ? `${artworkStats.total} file(s)` : 'No files'} />
        <MetricCard label="Due Date" value={order.dueDate} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Order Controls</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Select options={['draft', 'pending', 'approved', 'in-production', 'shipped', 'completed', 'cancelled']} value={order.status} onChange={(e) => void updateStatus(e.target.value as OrderStatus)} />
            <Select options={['unpaid', 'authorized', 'paid', 'refunded']} value={order.paymentStatus} onChange={(e) => void updatePayment(e.target.value as PaymentStatus)} />
            <Select options={['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch']} value={order.productionStage} onChange={(e) => void updateProduction(e.target.value as ProductionStage)} />
          </div>
        </Card>
        <Card><h3 className="mb-3 text-sm font-semibold">Shipment</h3><p className="text-sm text-textMuted">{order.shippingMethod}</p><p className="mt-2 text-sm">Tracking: <span className="text-textMuted">{order.trackingNumber || 'Not assigned yet'}</span></p></Card>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Summary' ? <div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-3 text-sm font-semibold">Customer</h3><div className="space-y-2 text-sm"><p>{order.customerName}</p><p className="text-textMuted">{order.customerEmail}</p><p className="text-textMuted">{order.organizationName}</p></div></Card><Card><h3 className="mb-3 text-sm font-semibold">Addresses</h3><div className="space-y-3 text-sm"><div><p className="font-medium">Shipping</p><p className="text-textMuted">{order.shippingAddress}</p></div><div><p className="font-medium">Billing</p><p className="text-textMuted">{order.billingAddress}</p></div></div></Card></div> : null}

      {activeTab === 'Items' ? <Card><h3 className="mb-4 text-sm font-semibold">Line Items</h3><div className="space-y-3">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-panelMuted p-3"><img src={item.thumbnail} alt={item.productName} className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="font-medium">{item.productName}</p><p className="text-xs text-textMuted">{item.sku}</p></div><div className="text-sm text-textMuted">Qty {item.quantity}</div><div className="text-sm">{order.currency} {item.totalPrice.toLocaleString()}</div></div>)}</div></Card> : null}

      {activeTab === 'Artwork' ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Order Artwork</h3><Button onClick={() => void loadArtwork(order)}><RefreshCw size={14} /> Refresh</Button></div>
            {artworkLoading ? <p className="text-sm text-textMuted">Loading artwork…</p> : null}
            {!artworkLoading && !artworkUploads.length ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-textMuted">No artwork matched this order yet. Uploads are matched by order ID first and product ID as fallback.</p> : null}
            <div className="space-y-3">{artworkUploads.map((upload) => <ArtworkUploadCard key={upload.id} upload={upload} onStatus={(action) => void updateArtworkStatus(upload, action)} busy={reviewingId === upload.id} />)}</div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Approval Workflow</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricMini label="Files" value={String(artworkStats.total)} />
              <MetricMini label="Approved" value={String(artworkStats.approved)} />
              <MetricMini label="Pending" value={String(artworkStats.pending)} />
              <MetricMini label="Blocked" value={String(artworkStats.blocked)} />
            </div>
            <label className="mt-4 block space-y-2 text-sm"><span className="text-textMuted">Reviewer note for next action</span><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Example: Please re-upload with 3mm bleed and embedded fonts." className="min-h-[100px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
            <p className="mt-4 text-sm leading-6 text-textMuted">Approving artwork moves this order from prepress to proofing when applicable. Reject/replacement actions add an internal note to the order.</p>
          </Card>
        </div>
      ) : null}

      {activeTab === 'Production' ? <Card><h3 className="mb-4 text-sm font-semibold">Production Workflow</h3><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch'].map((stage) => <div key={stage} className={`rounded-xl border px-3 py-4 text-center text-sm capitalize ${order.productionStage === stage ? 'border-accent bg-panelMuted' : 'border-border bg-panelMuted/40'}`}>{stage}</div>)}</div></Card> : null}
      {activeTab === 'Notes' ? <Card><h3 className="mb-4 text-sm font-semibold">Internal Notes</h3><div className="mb-4 flex gap-2"><Input placeholder="Add an internal note..." value={note} onChange={(e) => setNote(e.target.value)} /><PrimaryButton onClick={() => void addNote()}>Add Note</PrimaryButton></div><div className="space-y-2">{order.notes.map((item, index) => <div key={`${item}-${index}`} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm text-textMuted">{item}</div>)}</div></Card> : null}
      {activeTab === 'Activity' ? <Card><h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3><div className="space-y-3">{order.activity.map((event) => <div key={event.id} className="rounded-xl border border-border bg-panelMuted p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium">{event.label}</p><p className="text-xs text-textMuted">{event.timestamp}</p></div><p className="mt-1 text-sm text-textMuted">{event.description}</p></div>)}</div></Card> : null}
    </div>
  );
}

function ArtworkUploadCard({ upload, onStatus, busy }: { upload: ArtworkUpload; onStatus: (status: ArtworkReviewStatus) => void; busy: boolean }) {
  const status = upload.preflight?.preflight?.status || 'unknown';
  const reviewStatus = upload.reviewStatus || 'pending-review';
  const hints = upload.pdfHints || {};
  return (
    <div className="rounded-xl border border-border bg-panelMuted p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-panel"><FileText size={18} /></div><div><p className="font-medium">{upload.originalName}</p><p className="mt-1 text-xs text-textMuted">{formatSize(upload.sizeBytes)} · {upload.pageCount || '—'} page(s) · {upload.widthMm && upload.heightMm ? `${upload.widthMm} × ${upload.heightMm}mm` : 'size unknown'}</p><p className="mt-1 text-xs text-textMuted">PDF {hints.pdfVersion || 'version unknown'} · {(hints.colourSpaces || []).join(', ') || 'colour spaces unknown'}</p></div></div>
        <div className="flex flex-col items-end gap-2"><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs capitalize text-textMuted">Preflight: {status}</span><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(reviewStatus)}`}>Artwork: {reviewStatus.replace(/-/g, ' ')}</span></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><a href={absoluteUrl(upload.fileUrl)} target="_blank" rel="noreferrer"><Button><Eye size={14} /> View</Button></a><a href={absoluteUrl(upload.downloadUrl)}><Button><Download size={14} /> Download</Button></a><Button onClick={() => onStatus('approved')} disabled={busy}>Approve</Button><Button onClick={() => onStatus('rejected')} disabled={busy}>Reject</Button><Button onClick={() => onStatus('replacement-requested')} disabled={busy}>Request replacement</Button></div>
      <div className="mt-3 rounded-lg border border-border bg-panel px-3 py-3 text-sm text-textMuted">
        <div className="mb-1 flex items-center gap-2 text-white"><ShieldCheck size={15} /> Preflight details</div>
        {(upload.preflight?.preflight?.errors || []).map((msg: string) => <p key={msg} className="mt-1 text-red-300">• {msg}</p>)}
        {(upload.preflight?.preflight?.warnings || []).map((msg: string) => <p key={msg} className="mt-1 text-amber-200">• {msg}</p>)}
        {!(upload.preflight?.preflight?.errors || []).length && !(upload.preflight?.preflight?.warnings || []).length ? <p className="text-emerald-200">No current blocking issues detected.</p> : null}
        {upload.reviewNote ? <p className="mt-2 text-white">Last review note: {upload.reviewNote}</p> : null}
      </div>
      {upload.approvalHistory?.length ? <div className="mt-3 space-y-1 text-xs text-textMuted">{upload.approvalHistory.slice(-3).map((event) => <p key={event.id}>• {new Date(event.createdAt).toLocaleString()} — {event.actor}: {event.action.replace(/-/g, ' ')}{event.note ? ` — ${event.note}` : ''}</p>)}</div> : null}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-panelMuted p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-xl font-semibold capitalize">{value}</p></Card>;
}
