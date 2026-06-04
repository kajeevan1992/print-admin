'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, ExternalLink, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';
import { Input } from '@/components/forms/input';
import { ordersService } from '@/services/orders.service';
import type { Order, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

const tabs = ['Summary', 'Items', 'Artwork', 'Production', 'Payment', 'Notes', 'Activity'];

type ArtworkReviewStatus = 'pending-review' | 'approved' | 'rejected' | 'replacement-requested';
type PaymentAction = 'mark-paid' | 'mark-failed' | 'mark-refunded' | 'refund-note' | 'stripe-refund' | 'approve-quote' | 'create-payment-link';
type ProductionJobTicket = { id: string; orderId?: string; orderNumber: string; artworkUploadId?: string; productName: string; quantity: number; dueDate: string; priority: string; status: string; artworkStatus: string; machine: string; material?: string; route?: string[]; finishing?: string[]; dispatch?: Record<string, any>; updatedAt?: string };
type ArtworkUpload = { id: string; productId?: string; orderId?: string; quoteId?: string; productionJobId?: string; productionJobCreatedAt?: string; originalName: string; mimeType: string; sizeBytes: number; pageCount?: number; widthMm?: number; heightMm?: number; pdfHints?: any; fileUrl: string; downloadUrl: string; preflight?: any; reviewStatus?: ArtworkReviewStatus; reviewNote?: string; reviewedBy?: string; reviewedAt?: string; replacementRequestedAt?: string; approvalHistory?: Array<{ id: string; action: ArtworkReviewStatus | string; actor: string; note?: string; createdAt: string }>; createdAt: string };

function formatSize(bytes?: number) { return !bytes ? '0 MB' : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
function absoluteUrl(path: string) { if (typeof window === 'undefined') return path; return new URL(path, window.location.origin).toString(); }
function statusTone(status?: string) { if (status === 'paid' || status === 'approved' || status === 'ready-to-print' || status === 'printing' || status === 'finishing' || status === 'packing' || status === 'dispatched' || status === 'authorized') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'; if (status === 'failed' || status === 'refunded' || status === 'rejected' || status === 'replacement-requested' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-200'; return 'border-amber-500/30 bg-amber-500/10 text-amber-200'; }
function moneyMinor(value?: string | number) { const amount = Number(value || 0); return Number.isFinite(amount) ? amount : 0; }
function canApproveQuote(order: Order) { return order.status === 'pending' && order.paymentStatus === 'unpaid'; }
function canCreatePaymentLink(order: Order) { return order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.status !== 'cancelled'; }

export function OrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [artworkUploads, setArtworkUploads] = useState<ArtworkUpload[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJobTicket[]>([]);
  const [artworkLoading, setArtworkLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await ordersService.getOrder(id); setOrder(response.data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load order'); }
    finally { setLoading(false); }
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
    } finally { setArtworkLoading(false); }
  }, []);

  const loadProductionJobs = useCallback(async (currentOrder: Order) => {
    setProductionLoading(true);
    try {
      const candidates = [currentOrder.id, currentOrder.orderNumber].filter(Boolean);
      const results = await Promise.all(candidates.map(async (value) => {
        const res = await fetch(`/api/internal/orders/${encodeURIComponent(value)}/production-jobs`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));
        return Array.isArray(payload?.data?.items) ? payload.data.items : [];
      }));
      setProductionJobs(Array.from(new Map(results.flat().map((job) => [job.id, job])).values()));
    } finally { setProductionLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (order) { void loadArtwork(order); void loadProductionJobs(order); } }, [order, loadArtwork, loadProductionJobs]);

  const productionJobByArtworkId = useMemo(() => new Map(productionJobs.filter((job) => job.artworkUploadId).map((job) => [job.artworkUploadId, job])), [productionJobs]);
  const primaryProductionJob = productionJobs[0] || null;
  const artworkStats = useMemo(() => ({ total: artworkUploads.length, blocked: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'blocked').length, warning: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'warning').length, passed: artworkUploads.filter((item) => item.preflight?.preflight?.status === 'passed').length, approved: artworkUploads.filter((item) => item.reviewStatus === 'approved').length, pending: artworkUploads.filter((item) => !item.reviewStatus || item.reviewStatus === 'pending-review').length }), [artworkUploads]);

  async function updateArtworkStatus(upload: ArtworkUpload, action: ArtworkReviewStatus) {
    if (!order) return;
    setReviewingId(upload.id);
    try {
      const res = await fetch(`/api/internal/storefront/artwork/uploads/${upload.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: reviewNote, actor: 'admin', orderId: order.id, orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail, productName: order.items?.[0]?.productName || '' }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Artwork status update failed');
      setArtworkUploads((current) => current.map((item) => item.id === upload.id ? { ...payload.upload, productionJobId: payload.productionJob?.id || payload.upload?.productionJobId } : item));
      if (payload.productionJob) setProductionJobs((current) => current.some((job) => job.id === payload.productionJob.id) ? current.map((job) => job.id === payload.productionJob.id ? payload.productionJob : job) : [payload.productionJob, ...current]);
      setReviewNote('');
      if (action === 'approved' && order.productionStage === 'prepress') setOrder((await ordersService.updateProductionStage(order.id, 'proofing')).data);
      if (action === 'replacement-requested') setOrder((await ordersService.addNote(order.id, `Artwork replacement requested for ${upload.originalName}${reviewNote ? `: ${reviewNote}` : ''}`)).data);
      if (action === 'rejected') setOrder((await ordersService.addNote(order.id, `Artwork rejected for ${upload.originalName}${reviewNote ? `: ${reviewNote}` : ''}`)).data);
      if (action === 'approved') void loadProductionJobs(order);
    } catch (err) { setError(err instanceof Error ? err.message : 'Artwork status update failed'); }
    finally { setReviewingId(null); }
  }

  async function runPaymentAction(action: PaymentAction) {
    if (!order) return;
    setSavingPayment(true); setError(null); setCopiedPaymentLink(false);
    try {
      const amountMinor = refundAmount ? Math.round(Number(refundAmount) * 100) : undefined;
      const response = await ordersService.adminPaymentAction(order.id, { action, note: paymentNote, reference: paymentReference, amountMinor, actor: 'admin', paymentProvider: action === 'stripe-refund' || action === 'create-payment-link' ? 'stripe' : order.paymentProvider || 'manual', reason: 'requested_by_customer', customerEmail: order.customerEmail });
      setOrder(response.data); setPaymentNote(''); setPaymentReference(''); setRefundAmount('');
      if (response.paymentUrl) setPaymentLink(response.paymentUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'Payment action failed'); }
    finally { setSavingPayment(false); }
  }

  async function copyPaymentLink() {
    if (!paymentLink) return;
    await navigator.clipboard?.writeText(paymentLink).catch(() => null);
    setCopiedPaymentLink(true);
  }

  if (loading) return <Card>Loading order...</Card>;
  if (error || !order) return <Card className="text-red-200">{error ?? 'Order not found'}</Card>;

  const updateStatus = async (status: OrderStatus) => setOrder((await ordersService.updateOrderStatus(order.id, status)).data);
  const updatePayment = async (paymentStatus: PaymentStatus) => setOrder((await ordersService.updatePaymentStatus(order.id, paymentStatus)).data);
  const updateProduction = async (productionStage: ProductionStage) => setOrder((await ordersService.updateProductionStage(order.id, productionStage)).data);
  const addNote = async () => { if (!note.trim()) return; setOrder((await ordersService.addNote(order.id, note)).data); setNote(''); };

  return (
    <div>
      <PageHeader title={`Order ${order.orderNumber}`} subtitle={`${order.customerName} · ${order.organizationName} · ${order.storeName}`} actions={<><Button>Download Proof</Button>{primaryProductionJob ? <a href={`/production/jobs/${primaryProductionJob.id}`}><PrimaryButton><ExternalLink size={14} /> Open Production Job</PrimaryButton></a> : <PrimaryButton disabled>Open Production Job</PrimaryButton>}</>} />
      {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-5">
        <MetricCard label="Total" value={`${order.currency} ${order.total.toLocaleString()}`} />
        <MetricCard label="Status" value={order.status.replace(/-/g, ' ')} />
        <MetricCard label="Payment" value={order.paymentStatus.replace(/-/g, ' ')} />
        <MetricCard label="Artwork" value={artworkStats.approved ? `${artworkStats.approved}/${artworkStats.total} approved` : artworkStats.blocked ? `${artworkStats.blocked} blocked` : artworkStats.warning ? `${artworkStats.warning} warnings` : artworkStats.total ? `${artworkStats.total} file(s)` : 'No files'} />
        <MetricCard label="Production" value={productionJobs.length ? `${productionJobs.length} job(s)` : 'No job yet'} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Order Controls</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Select options={['draft', 'pending', 'approved', 'in-production', 'shipped', 'completed', 'cancelled']} value={order.status} onChange={(e) => void updateStatus(e.target.value as OrderStatus)} />
            <Select options={['unpaid', 'authorized', 'paid', 'failed', 'refund-pending', 'refunded']} value={order.paymentStatus} onChange={(e) => void updatePayment(e.target.value as PaymentStatus)} />
            <Select options={['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch']} value={order.productionStage} onChange={(e) => void updateProduction(e.target.value as ProductionStage)} />
          </div>
        </Card>
        <Card><h3 className="mb-3 text-sm font-semibold">Shipment</h3><p className="text-sm text-textMuted">{order.shippingMethod}</p><p className="mt-2 text-sm">Tracking: <span className="text-textMuted">{primaryProductionJob?.dispatch?.trackingNumber || order.trackingNumber || 'Not assigned yet'}</span></p></Card>
      </div>

      <PaymentAdminPanel order={order} paymentLink={paymentLink} copiedPaymentLink={copiedPaymentLink} onCopyPaymentLink={() => void copyPaymentLink()} paymentNote={paymentNote} setPaymentNote={setPaymentNote} paymentReference={paymentReference} setPaymentReference={setPaymentReference} refundAmount={refundAmount} setRefundAmount={setRefundAmount} saving={savingPayment} onAction={(action) => void runPaymentAction(action)} />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Summary' ? <div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-3 text-sm font-semibold">Customer</h3><div className="space-y-2 text-sm"><p>{order.customerName}</p><p className="text-textMuted">{order.customerEmail}</p><p className="text-textMuted">{order.organizationName}</p></div></Card><Card><h3 className="mb-3 text-sm font-semibold">Addresses</h3><div className="space-y-3 text-sm"><div><p className="font-medium">Shipping</p><p className="text-textMuted">{order.shippingAddress}</p></div><div><p className="font-medium">Billing</p><p className="text-textMuted">{order.billingAddress}</p></div></div></Card></div> : null}
      {activeTab === 'Payment' ? <PaymentAdminPanel order={order} paymentLink={paymentLink} copiedPaymentLink={copiedPaymentLink} onCopyPaymentLink={() => void copyPaymentLink()} paymentNote={paymentNote} setPaymentNote={setPaymentNote} paymentReference={paymentReference} setPaymentReference={setPaymentReference} refundAmount={refundAmount} setRefundAmount={setRefundAmount} saving={savingPayment} onAction={(action) => void runPaymentAction(action)} expanded /> : null}
      {activeTab === 'Items' ? <Card><h3 className="mb-4 text-sm font-semibold">Line Items</h3><div className="space-y-3">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-panelMuted p-3"><img src={item.thumbnail} alt={item.productName} className="h-14 w-14 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="font-medium">{item.productName}</p><p className="text-xs text-textMuted">{item.sku}</p></div><div className="text-sm text-textMuted">Qty {item.quantity}</div><div className="text-sm">{order.currency} {item.totalPrice.toLocaleString()}</div></div>)}</div></Card> : null}
      {activeTab === 'Artwork' ? <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]"><Card><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Order Artwork</h3><Button onClick={() => { void loadArtwork(order); void loadProductionJobs(order); }}><RefreshCw size={14} /> Refresh</Button></div>{artworkLoading ? <p className="text-sm text-textMuted">Loading artwork…</p> : null}{!artworkLoading && !artworkUploads.length ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-textMuted">No artwork matched this order yet. Uploads are matched by order ID first and product ID as fallback.</p> : null}<div className="space-y-3">{artworkUploads.map((upload) => <ArtworkUploadCard key={upload.id} upload={upload} productionJob={productionJobByArtworkId.get(upload.id) || productionJobs.find((job) => job.id === upload.productionJobId)} onStatus={(action) => void updateArtworkStatus(upload, action)} busy={reviewingId === upload.id} />)}</div></Card><Card><h3 className="mb-3 text-sm font-semibold">Approval Workflow</h3><div className="grid gap-3 sm:grid-cols-2"><MetricMini label="Files" value={String(artworkStats.total)} /><MetricMini label="Approved" value={String(artworkStats.approved)} /><MetricMini label="Pending" value={String(artworkStats.pending)} /><MetricMini label="Production Jobs" value={String(productionJobs.length)} /></div><label className="mt-4 block space-y-2 text-sm"><span className="text-textMuted">Reviewer note for next action</span><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Example: Please re-upload with 3mm bleed and embedded fonts." className="min-h-[100px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label><p className="mt-4 text-sm leading-6 text-textMuted">Approving artwork now creates or links a production job ticket. Use the production job link to manage printing, finishing, packing and dispatch.</p></Card></div> : null}
      {activeTab === 'Production' ? <ProductionJobsPanel loading={productionLoading} jobs={productionJobs} orderStage={order.productionStage} onRefresh={() => void loadProductionJobs(order)} /> : null}
      {activeTab === 'Notes' ? <Card><h3 className="mb-4 text-sm font-semibold">Internal Notes</h3><div className="mb-4 flex gap-2"><Input placeholder="Add an internal note..." value={note} onChange={(e) => setNote(e.target.value)} /><PrimaryButton onClick={() => void addNote()}>Add Note</PrimaryButton></div><div className="space-y-2">{order.notes.map((item, index) => <div key={`${item}-${index}`} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm text-textMuted">{item}</div>)}</div></Card> : null}
      {activeTab === 'Activity' ? <Card><h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3><div className="space-y-3">{order.activity.map((event) => <div key={event.id} className="rounded-xl border border-border bg-panelMuted p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium">{event.label}</p><p className="text-xs text-textMuted">{event.timestamp}</p></div><p className="mt-1 text-sm text-textMuted">{event.description}</p></div>)}</div></Card> : null}
    </div>
  );
}

function PaymentAdminPanel({ order, paymentLink, copiedPaymentLink, onCopyPaymentLink, paymentNote, setPaymentNote, paymentReference, setPaymentReference, refundAmount, setRefundAmount, saving, onAction, expanded = false }: { order: Order; paymentLink: string; copiedPaymentLink: boolean; onCopyPaymentLink: () => void; paymentNote: string; setPaymentNote: (v: string) => void; paymentReference: string; setPaymentReference: (v: string) => void; refundAmount: string; setRefundAmount: (v: string) => void; saving: boolean; onAction: (action: PaymentAction) => void; expanded?: boolean }) {
  const approveVisible = canApproveQuote(order);
  const paymentLinkVisible = canCreatePaymentLink(order);
  return <Card className="mb-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Payment Status</h3><p className="mt-1 text-xs text-textMuted">Approve quote orders, create Stripe payment links, or manage manual/Stripe refunds from the existing order flow.</p></div><span className={`rounded-full border px-3 py-1 text-xs capitalize ${statusTone(order.paymentStatus)}`}>{order.paymentStatus.replace(/-/g, ' ')}</span></div>{approveVisible ? <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><p className="font-semibold text-white">Quote/order awaiting approval</p><p className="mt-1 text-xs">Approve the quote first, then create a Stripe payment link for the customer. The payment link action also auto-approves this order if needed.</p></div> : null}<div className="grid gap-3 lg:grid-cols-4"><MetricMini label="Provider" value={order.paymentProvider || 'manual/unknown'} /><MetricMini label="Reference" value={order.paymentReference || order.stripeRefundId || order.stripeCheckoutSessionId || 'not set'} /><MetricMini label="Paid at" value={order.paidAt ? new Date(order.paidAt).toLocaleString() : 'not paid'} /><MetricMini label="Refund" value={order.stripeRefundStatus || (order.refundedAt ? 'refunded' : order.refundNote ? 'note added' : 'none')} /></div>{paymentLink ? <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"><p className="font-semibold text-white">Payment link ready</p><p className="mt-2 break-all text-xs">{paymentLink}</p><div className="mt-3 flex flex-wrap gap-2"><Button onClick={onCopyPaymentLink}>{copiedPaymentLink ? 'Copied' : 'Copy payment link'}</Button><a href={paymentLink} target="_blank" rel="noreferrer"><PrimaryButton><ExternalLink size={14} /> Open link</PrimaryButton></a></div></div> : null}{expanded ? <div className="mt-4 grid gap-3 rounded-xl border border-border bg-panelMuted p-4 text-sm text-textMuted"><p>Stripe session: {order.stripeCheckoutSessionId || 'not set'}</p><p>Payment intent: {order.stripePaymentIntentId || 'not set'}</p><p>Stripe refund: {order.stripeRefundId || 'not set'}</p><p>Stripe refund status: {order.stripeRefundStatus || 'not set'}</p><p>Failure reason: {order.paymentFailureReason || 'none'}</p><p>Refund note: {order.refundNote || 'none'}</p><p>Refund amount: {moneyMinor(order.refundAmountMinor) ? `£${(moneyMinor(order.refundAmountMinor) / 100).toFixed(2)}` : 'not set'}</p></div> : null}<div className="mt-4 grid gap-3 md:grid-cols-3"><Input placeholder="Payment/refund reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} /><Input placeholder="Refund amount e.g. 12.50 (empty = full Stripe refund)" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} /><Input placeholder="Admin note" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} /></div><div className="mt-4 flex flex-wrap gap-2">{approveVisible ? <PrimaryButton onClick={() => onAction('approve-quote')} disabled={saving}>Approve Quote</PrimaryButton> : null}{paymentLinkVisible ? <PrimaryButton onClick={() => onAction('create-payment-link')} disabled={saving}>Create Payment Link</PrimaryButton> : null}<PrimaryButton onClick={() => onAction('mark-paid')} disabled={saving}>Mark Paid</PrimaryButton><Button onClick={() => onAction('mark-failed')} disabled={saving}>Mark Failed</Button><Button onClick={() => onAction('stripe-refund')} disabled={saving}>Create Stripe Refund</Button><Button onClick={() => onAction('refund-note')} disabled={saving}>Add Refund Note</Button><Button onClick={() => onAction('mark-refunded')} disabled={saving}>Mark Refunded</Button></div></Card>;
}

function ProductionJobsPanel({ loading, jobs, orderStage, onRefresh }: { loading: boolean; jobs: ProductionJobTicket[]; orderStage: string; onRefresh: () => void }) { return <Card><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Production Jobs</h3><Button onClick={onRefresh}><RefreshCw size={14} /> Refresh</Button></div>{loading ? <p className="text-sm text-textMuted">Loading production jobs…</p> : null}{!loading && !jobs.length ? <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-textMuted">No production job linked yet. Approve artwork to create a production ticket automatically.</div> : null}<div className="grid gap-3 lg:grid-cols-2">{jobs.map((job) => <div key={job.id} className="rounded-xl border border-border bg-panelMuted p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-white">{job.productName}</p><p className="mt-1 text-xs text-textMuted">{job.id} · {job.machine || 'Unassigned'} · Qty {job.quantity}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(job.status)}`}>{job.status.replace(/-/g, ' ')}</span></div><div className="mt-3 grid gap-2 text-sm text-textMuted sm:grid-cols-2"><p>Order stage: {orderStage}</p><p>Due: {job.dueDate}</p><p>Priority: {job.priority}</p><p>Artwork: {job.artworkStatus}</p><p>Material: {job.material || 'not set'}</p><p>Tracking: {job.dispatch?.trackingNumber || 'not set'}</p></div><div className="mt-3 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-textMuted">Route: {(job.route || []).join(' → ') || 'not set'}<br />Finishing: {(job.finishing || []).join(', ') || 'none'}</div><div className="mt-3 flex flex-wrap gap-2"><a href={`/production/jobs/${job.id}`}><PrimaryButton><ExternalLink size={14} /> Open Job Detail</PrimaryButton></a><a href="/production"><Button>Open Scheduler</Button></a><a href="/dispatch-center"><Button>Dispatch Center</Button></a></div></div>)}</div></Card>; }
function ArtworkUploadCard({ upload, productionJob, onStatus, busy }: { upload: ArtworkUpload; productionJob?: ProductionJobTicket; onStatus: (status: ArtworkReviewStatus) => void; busy: boolean }) { const status = upload.preflight?.preflight?.status || 'unknown'; const reviewStatus = upload.reviewStatus || 'pending-review'; const hints = upload.pdfHints || {}; return <div className="rounded-xl border border-border bg-panelMuted p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-panel"><FileText size={18} /></div><div><p className="font-medium">{upload.originalName}</p><p className="mt-1 text-xs text-textMuted">{formatSize(upload.sizeBytes)} · {upload.pageCount || '—'} page(s) · {upload.widthMm && upload.heightMm ? `${upload.widthMm} × ${upload.heightMm}mm` : 'size unknown'}</p><p className="mt-1 text-xs text-textMuted">PDF {hints.pdfVersion || 'version unknown'} · {(hints.colourSpaces || []).join(', ') || 'colour spaces unknown'}</p></div></div><div className="flex flex-col items-end gap-2"><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs capitalize text-textMuted">Preflight: {status}</span><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(reviewStatus)}`}>Artwork: {reviewStatus.replace(/-/g, ' ')}</span>{productionJob ? <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(productionJob.status)}`}>Job: {productionJob.status.replace(/-/g, ' ')}</span> : null}</div></div><div className="mt-3 flex flex-wrap gap-2"><a href={absoluteUrl(upload.fileUrl)} target="_blank" rel="noreferrer"><Button><Eye size={14} /> View</Button></a><a href={absoluteUrl(upload.downloadUrl)}><Button><Download size={14} /> Download</Button></a>{productionJob ? <a href={`/production/jobs/${productionJob.id}`}><PrimaryButton><ExternalLink size={14} /> Open production job</PrimaryButton></a> : null}<Button onClick={() => onStatus('approved')} disabled={busy}>Approve</Button><Button onClick={() => onStatus('rejected')} disabled={busy}>Reject</Button><Button onClick={() => onStatus('replacement-requested')} disabled={busy}>Request replacement</Button></div><div className="mt-3 rounded-lg border border-border bg-panel px-3 py-3 text-sm text-textMuted"><div className="mb-1 flex items-center gap-2 text-white"><ShieldCheck size={15} /> Preflight details</div>{(upload.preflight?.preflight?.errors || []).map((msg: string) => <p key={msg} className="mt-1 text-red-300">• {msg}</p>)}{(upload.preflight?.preflight?.warnings || []).map((msg: string) => <p key={msg} className="mt-1 text-amber-200">• {msg}</p>)}{!(upload.preflight?.preflight?.errors || []).length && !(upload.preflight?.preflight?.warnings || []).length ? <p className="text-emerald-200">No current blocking issues detected.</p> : null}{upload.reviewNote ? <p className="mt-2 text-white">Last review note: {upload.reviewNote}</p> : null}{productionJob ? <p className="mt-2 text-white">Linked production job: {productionJob.id}</p> : null}</div>{upload.approvalHistory?.length ? <div className="mt-3 space-y-1 text-xs text-textMuted">{upload.approvalHistory.slice(-3).map((event) => <p key={event.id}>• {new Date(event.createdAt).toLocaleString()} — {event.actor}: {String(event.action).replace(/-/g, ' ')}{event.note ? ` — ${event.note}` : ''}</p>)}</div> : null}</div>; }
function MetricMini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-panelMuted p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-sm font-semibold text-white">{value}</p></div>; }
function MetricCard({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-xl font-semibold capitalize">{value}</p></Card>; }
