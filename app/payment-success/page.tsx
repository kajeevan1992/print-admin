'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, PackageCheck, ReceiptText, Search } from 'lucide-react';

type SyncState = { loading: boolean; error: string; trackUrl: string; message: string; orderNumber: string; paymentStatus: string };

function text(value: unknown) { return String(value || '').trim(); }

export default function PaymentSuccessPage() {
  const [state, setState] = useState<SyncState>({ loading: true, error: '', trackUrl: '/track-order', message: 'Confirming your payment…', orderNumber: '', paymentStatus: '' });

  useEffect(() => {
    async function sync() {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = text(params.get('session_id'));
        const orderId = text(params.get('orderId') || params.get('orderNumber'));
        if (!sessionId) throw new Error('Stripe session ID is missing from the return URL. Your payment may still be processing.');
        const query = new URLSearchParams({ session_id: sessionId, action: 'success' });
        if (orderId) query.set('orderId', orderId);
        const response = await fetch(`/api/native-storefront/payment-return?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not confirm payment return.');
        const order = payload.result?.order || {};
        setState({ loading: false, error: '', trackUrl: payload.trackUrl || `/track-order?orderId=${encodeURIComponent(order.orderNumber || order.id || orderId)}`, message: payload.result?.paid ? 'Payment confirmed. Your order can now continue to artwork/proof and production.' : 'Payment return received. If Stripe is still processing, the order will update automatically.', orderNumber: order.orderNumber || orderId || '', paymentStatus: order.paymentStatus || (payload.result?.paid ? 'paid' : 'processing') });
      } catch (error) {
        const params = new URLSearchParams(window.location.search);
        const fallbackOrderId = text(params.get('orderId') || params.get('orderNumber'));
        setState({ loading: false, error: error instanceof Error ? error.message : 'Payment confirmation failed.', trackUrl: fallbackOrderId ? `/track-order?orderId=${encodeURIComponent(fallbackOrderId)}` : '/track-order', message: 'We could not confirm the payment immediately.', orderNumber: fallbackOrderId, paymentStatus: 'checking' });
      }
    }
    void sync();
  }, []);

  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8"><section className="mx-auto max-w-3xl rounded-[32px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-100">{state.loading ? <Loader2 className="animate-spin" size={28} /> : <CheckCircle2 size={30} />}</div><div className="mt-6 text-center"><p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200">Payment return</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{state.error ? 'Payment is being checked' : 'Thank you — payment received'}</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300">{state.error || state.message}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-slate-400"><ReceiptText size={16} /><p className="text-xs uppercase tracking-[0.18em]">Order</p></div><p className="mt-2 text-lg font-black">{state.orderNumber || 'Checking'}</p></div><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-slate-400"><PackageCheck size={16} /><p className="text-xs uppercase tracking-[0.18em]">Payment</p></div><p className="mt-2 text-lg font-black capitalize">{state.paymentStatus || 'checking'}</p></div></div><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><a href={state.trackUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"><Search size={16} /> Track order</a><a href="/storefront/upload-artwork" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white">Upload artwork</a></div></section></main>;
}
