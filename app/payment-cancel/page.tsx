'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Loader2, Search } from 'lucide-react';

type CancelState = { loading: boolean; error: string; trackUrl: string; message: string; orderNumber: string; paymentStatus: string };
function text(value: unknown) { return String(value || '').trim(); }

export default function PaymentCancelPage() {
  const [state, setState] = useState<CancelState>({ loading: true, error: '', trackUrl: '/track-order', message: 'Recording the cancelled payment attempt…', orderNumber: '', paymentStatus: 'cancelled' });

  useEffect(() => {
    async function sync() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = text(params.get('session_id'));
      const orderId = text(params.get('orderId') || params.get('orderNumber'));
      try {
        if (!orderId) throw new Error('Order ID is missing from the cancelled payment return URL.');
        const query = new URLSearchParams({ orderId, action: 'cancel' });
        if (sessionId) query.set('session_id', sessionId);
        const response = await fetch(`/api/native-storefront/payment-return?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not record cancelled checkout.');
        const order = payload.result?.order || {};
        setState({ loading: false, error: '', trackUrl: payload.trackUrl || `/track-order?orderId=${encodeURIComponent(order.orderNumber || order.id || orderId)}`, message: 'No payment was taken. Your order is still waiting for payment before production can start.', orderNumber: order.orderNumber || orderId, paymentStatus: order.paymentStatus || 'cancelled' });
      } catch (error) {
        setState({ loading: false, error: error instanceof Error ? error.message : 'Could not record cancelled checkout.', trackUrl: orderId ? `/track-order?orderId=${encodeURIComponent(orderId)}` : '/track-order', message: 'No payment was taken. You can return to your order status or contact the store for a new payment link.', orderNumber: orderId, paymentStatus: 'cancelled' });
      }
    }
    void sync();
  }, []);

  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8"><section className="mx-auto max-w-3xl rounded-[32px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-amber-400/30 bg-amber-400/10 text-amber-100">{state.loading ? <Loader2 className="animate-spin" size={28} /> : <AlertTriangle size={30} />}</div><div className="mt-6 text-center"><p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-200">Payment cancelled</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">No payment was taken</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300">{state.error || state.message}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order</p><p className="mt-2 text-lg font-black">{state.orderNumber || 'Checking'}</p></div><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Payment</p><p className="mt-2 text-lg font-black capitalize">{state.paymentStatus}</p></div></div><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><a href={state.trackUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"><Search size={16} /> Track order</a><a href="mailto:sales@holoprint.co.uk" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white"><CreditCard size={16} /> Request payment link</a></div></section></main>;
}
