'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, FileText, Loader2, PackageCheck, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import { ordersService } from '@/services/orders.service';
import type { Order, PaymentStatus, ProductionStage } from '@/modules/orders/types';

const paymentStatuses: PaymentStatus[] = ['unpaid', 'pending', 'authorized', 'captured', 'paid', 'failed', 'cancelled', 'refund-pending', 'refunded'];
const productionStages: ProductionStage[] = ['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch'];

function money(value: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0)); }
function statusLabel(value?: string) { return String(value || 'unknown').replace(/-/g, ' '); }
function paymentReleased(order: Order | null) { return Boolean(order && ['paid', 'captured', 'authorized'].includes(String(order.paymentStatus || '').toLowerCase())); }
function paymentNeeded(order: Order | null) { return Boolean(order && ['unpaid', 'pending', 'failed', 'cancelled'].includes(String(order.paymentStatus || '').toLowerCase()) && !['cancelled', 'completed'].includes(order.status)); }
function pillTone(value: string) { const text = value.toLowerCase(); if (text.includes('paid') || text.includes('captured') || text.includes('authorized') || text.includes('completed') || text.includes('dispatch') || text.includes('shipped')) return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'; if (text.includes('failed') || text.includes('cancel') || text.includes('unpaid') || text.includes('pending')) return 'border-rose-400/25 bg-rose-400/10 text-rose-100'; if (text.includes('proof') || text.includes('review') || text.includes('queued')) return 'border-amber-400/25 bg-amber-400/10 text-amber-100'; return 'border-sky-400/25 bg-sky-400/10 text-sky-100'; }
function Pill({ value }: { value: string }) { return <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${pillTone(value)}`}>{statusLabel(value)}</span>; }
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-3xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</section>; }
function Stat({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></Card>; }

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params?.orderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await ordersService.getOrder(orderId);
      setOrder(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed to load.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (orderId) void load(); }, [orderId]);

  const releaseMessage = useMemo(() => {
    if (!order) return '';
    if (paymentReleased(order)) return 'Payment gate released. This order can continue into artwork, proofing, production and dispatch checks.';
    if (paymentNeeded(order)) return 'Payment is still holding this order. Do not release production until payment is paid, captured or authorised.';
    return 'Monitor payment and production state before releasing the job.';
  }, [order]);

  async function setPayment(paymentStatus: PaymentStatus) {
    if (!order) return;
    setBusy(`payment-${paymentStatus}`);
    setMessage('');
    setError('');
    try {
      const response = await ordersService.updatePaymentStatus(order.id, paymentStatus);
      setOrder(response.data);
      setMessage(`Payment status updated to ${statusLabel(paymentStatus)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment update failed.');
    } finally {
      setBusy('');
    }
  }
  async function setStage(productionStage: ProductionStage) {
    if (!order) return;
    if (!paymentReleased(order)) { setError('Payment must be paid, captured or authorised before changing production stage.'); return; }
    setBusy(`stage-${productionStage}`);
    setMessage('');
    setError('');
    try {
      const response = await ordersService.updateProductionStage(order.id, productionStage);
      setOrder(response.data);
      setMessage(`Production stage updated to ${statusLabel(productionStage)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Production stage update failed.');
    } finally {
      setBusy('');
    }
  }
  async function addNote() {
    if (!order) return;
    setBusy('note');
    setMessage('');
    setError('');
    try {
      const response = await ordersService.addNote(order.id, `Admin reviewed order payment gate on ${new Date().toLocaleString('en-GB')}.`);
      setOrder(response.data);
      setMessage('Review note added to order.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Note update failed.');
    } finally {
      setBusy('');
    }
  }

  if (loading && !order) return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]"><Loader2 className="mr-3 animate-spin" /> Loading order…</div></main>;

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Link href="/orders" className="inline-flex items-center gap-2 text-sm font-bold text-sky-200"><ArrowLeft size={16} /> Back to orders</Link><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">Order detail</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{order?.orderNumber || orderId}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Payment, proof, production and dispatch gate for one order. This uses the existing Orders service and internal order API.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void load()} className="rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100"><RefreshCcw size={15} className="inline" /> Refresh</button><Link href="/production-board" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white">Production Board</Link><Link href="/artwork-proofing" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white">Proofing</Link></div></div></section>
    {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle className="mr-2 inline" size={17}/>{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline" size={17}/>{message}</div> : null}
    {!order ? <Card><p className="text-sm text-slate-400">Order was not found.</p></Card> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Stat label="Total" value={money(order.total, order.currency)} /><Stat label="Items" value={String(order.itemCount || order.items?.length || 0)} /><Stat label="Payment" value={statusLabel(order.paymentStatus)} /><Stat label="Order status" value={statusLabel(order.status)} /><Stat label="Production" value={statusLabel(order.productionStage)} /></div>
      <Card className={paymentReleased(order) ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-rose-400/20 bg-rose-400/5'}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Proof + payment gate</p><h2 className="mt-2 text-xl font-black text-white">{paymentReleased(order) ? 'Payment released' : 'Payment holding production'}</h2><p className="mt-2 text-sm text-slate-400">{releaseMessage}</p></div><div className="flex flex-wrap gap-2"><Pill value={`Payment ${order.paymentStatus}`} /><Pill value={`Status ${order.status}`} /><Pill value={`Stage ${order.productionStage}`} /></div></div></Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]"><Card><h2 className="text-lg font-black text-white">Customer + payment</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><Info label="Customer" value={order.customerName} /><Info label="Email" value={order.customerEmail || 'No email'} /><Info label="Provider" value={order.paymentProvider || 'Not set'} /><Info label="Reference" value={order.paymentReference || order.stripePaymentIntentId || order.stripeCheckoutSessionId || 'Not set'} /><Info label="Paid at" value={order.paidAt ? new Date(order.paidAt).toLocaleString('en-GB') : 'Not paid'} /><Info label="Store" value={order.storeName || 'Internal orders'} /></div><div className="mt-5 flex flex-wrap gap-2">{paymentStatuses.map((status) => <button key={status} disabled={Boolean(busy)} onClick={() => void setPayment(status)} className={`rounded-xl border px-3 py-2 text-xs font-bold capitalize disabled:opacity-50 ${order.paymentStatus === status ? 'border-white bg-white text-slate-950' : 'border-white/10 bg-white/[0.03] text-white'}`}>{statusLabel(status)}</button>)}</div></Card>
      <Card><h2 className="text-lg font-black text-white">Production gate</h2><p className="mt-2 text-sm text-slate-400">Production stage changes are disabled until payment is released.</p><div className="mt-4 grid gap-2">{productionStages.map((stage) => <button key={stage} disabled={busy === `stage-${stage}` || !paymentReleased(order)} onClick={() => void setStage(stage)} className={`rounded-xl border px-3 py-3 text-left text-sm font-bold capitalize disabled:opacity-50 ${order.productionStage === stage ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white'}`}><span className="inline-flex items-center gap-2"><PackageCheck size={15} />{statusLabel(stage)}</span></button>)}</div></Card></div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><Card><h2 className="text-lg font-black text-white">Items</h2><div className="mt-4 space-y-3">{order.items?.length ? order.items.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-white">{item.productName}</p><p className="mt-1 text-xs text-slate-500">SKU {item.sku || item.productId}</p></div><div className="text-sm text-slate-300">× {item.quantity} · {money(item.totalPrice, order.currency)}</div></div></div>) : <p className="text-sm text-slate-400">No items found.</p>}</div></Card><Card><h2 className="text-lg font-black text-white">Admin notes</h2><div className="mt-4 space-y-2">{order.notes?.length ? order.notes.slice(0, 8).map((note, index) => <div key={`${note}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300"><FileText className="mr-2 inline" size={14}/>{note}</div>) : <p className="text-sm text-slate-400">No notes yet.</p>}</div><button onClick={() => void addNote()} disabled={busy === 'note'} className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Add payment-gate review note</button></Card></div>
      <div className="grid gap-4 xl:grid-cols-3"><Card><div className="flex items-center gap-2 text-emerald-100"><CreditCard size={18}/><h3 className="font-black">Payment</h3></div><p className="mt-3 text-sm text-slate-400">{paymentReleased(order) ? 'Paid/captured/authorised orders can proceed to artwork and production gates.' : 'Collect payment before production release.'}</p></Card><Card><div className="flex items-center gap-2 text-sky-100"><ShieldCheck size={18}/><h3 className="font-black">Proofing</h3></div><p className="mt-3 text-sm text-slate-400">Use Artwork Proofing to approve customer proof after artwork passes preflight.</p></Card><Card><div className="flex items-center gap-2 text-violet-100"><Truck size={18}/><h3 className="font-black">Dispatch</h3></div><p className="mt-3 text-sm text-slate-400">Dispatch only sees jobs that pass proof, payment and production gates.</p></Card></div>
    </>}
  </div></main>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
