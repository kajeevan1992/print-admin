'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { StorefrontPaymentConfirmation } from '@/core/payments/storefront-payment-confirmation.service';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

type Props = {
  tenantSlug: string;
  storeSlug: string;
  storeBase: string;
  orderId: string;
  paymentToken: string;
  sessionId: string;
  page: 'success' | 'cancel';
  initialConfirmation: StorefrontPaymentConfirmation;
  appearance?: unknown;
  brand?: Partial<StorefrontBrandSettings>;
};

function statusTitle(state: StorefrontPaymentConfirmation['state']) {
  if (state === 'paid') return 'Payment confirmed';
  if (state === 'authorized') return 'Payment authorised';
  if (state === 'pending') return 'Payment is processing';
  if (state === 'expired') return 'Payment session expired';
  if (state === 'failed') return 'Payment failed';
  if (state === 'cancelled') return 'Payment was not completed';
  if (state === 'refunded') return 'Payment refunded';
  if (state === 'unpaid') return 'Payment required';
  return 'Payment could not be verified';
}
function isPositive(state: StorefrontPaymentConfirmation['state']) { return ['paid', 'authorized'].includes(state); }
function iconFor(state: StorefrontPaymentConfirmation['state']) {
  if (state === 'paid' || state === 'authorized') return CheckCircle2;
  if (state === 'pending') return Clock3;
  return XCircle;
}

export default function PaymentConfirmationPanel({ tenantSlug, storeSlug, storeBase, orderId, paymentToken, sessionId, page, initialConfirmation, appearance, brand }: Props) {
  const [confirmation, setConfirmation] = useState(initialConfirmation);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState('');
  const pollCount = useRef(0);
  const widget = protectedWidgetTheme(appearance, brand);
  const Icon = iconFor(confirmation.state);
  const positive = isPositive(confirmation.state);
  const statusColour = positive ? '#15803d' : confirmation.state === 'pending' ? '#a16207' : '#b91c1c';
  const statusBackground = positive ? '#f0fdf4' : confirmation.state === 'pending' ? '#fffbeb' : '#fef2f2';
  const query = useMemo(() => {
    const params = new URLSearchParams({ tenantSlug, storeSlug, orderId, payment_token: paymentToken, page });
    if (sessionId) params.set('session_id', sessionId);
    return params.toString();
  }, [tenantSlug, storeSlug, orderId, paymentToken, sessionId, page]);

  async function refresh(silent = false) {
    if (!silent) setChecking(true);
    setActionError('');
    try {
      const response = await fetch(`/api/native-storefront/payment-status?${query}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.confirmation) throw new Error(payload?.error || payload?.confirmation?.error || 'Payment status could not be checked.');
      setConfirmation(payload.confirmation);
      if (payload.confirmation.state === 'paid') window.dispatchEvent(new CustomEvent('storefront:basket-changed', { detail: { lineCount: 0, itemCount: 0, grossMinor: 0, formattedTotal: '£0.00' } }));
    } catch (error) {
      if (!silent) setActionError(error instanceof Error ? error.message : 'Payment status could not be checked.');
    } finally {
      if (!silent) setChecking(false);
    }
  }

  useEffect(() => {
    if (confirmation.state !== 'pending' || pollCount.current >= 30) return;
    const timer = window.setTimeout(async () => {
      pollCount.current += 1;
      await refresh(true);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [confirmation.state, query]);

  async function retryPayment() {
    setRetrying(true);
    setActionError('');
    try {
      const response = await fetch('/api/native-storefront/payment-status', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ action: 'retry', tenantSlug, storeSlug, orderId, paymentToken }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.paymentUrl) throw new Error(payload?.error || 'Payment could not be restarted.');
      window.location.assign(payload.paymentUrl);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Payment could not be restarted.');
      setRetrying(false);
    }
  }

  return <div data-protected-widget="payment-confirmation" className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
    <div className="rounded-[22px] border p-5" style={{ borderColor: statusColour, backgroundColor: statusBackground }}>
      <div className="flex items-start gap-4"><Icon className="mt-0.5 h-8 w-8 shrink-0" style={{ color: statusColour }} /><div><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: statusColour }}>{confirmation.verified ? 'Verified with Stripe' : confirmation.valid ? 'Order verified' : 'Verification failed'}</div><h1 className="mt-2 text-[34px] font-black tracking-[-0.055em]" style={widget.styles.text}>{statusTitle(confirmation.state)}</h1><p className="mt-3 max-w-[720px] text-[13px] leading-7" style={widget.styles.muted}>{confirmation.message}</p></div></div>
    </div>

    {confirmation.valid ? <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><div className={widget.classes.label} style={widget.styles.muted}>Order reference</div><div className="mt-1 text-[18px] font-black" style={widget.styles.text}>{confirmation.orderNumber || confirmation.orderId}</div></div>{confirmation.formattedTotal ? <div className="text-right"><div className={widget.classes.label} style={widget.styles.muted}>Verified order total</div><div className="mt-1 text-[22px] font-black" style={widget.styles.text}>{confirmation.formattedTotal}</div></div> : null}</div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-bold" style={widget.styles.muted}><ShieldCheck className="h-4 w-4" />The order, tenant, store, Stripe session, currency and amount are checked server-side.</div>
    </div> : null}

    {actionError ? <div className={`${widget.classes.top} ${widget.classes.section} text-[12px] font-bold`} style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}>{actionError}</div> : null}

    <div className={`${widget.classes.top} flex flex-wrap gap-3`}>
      {confirmation.canRetry ? <button type="button" disabled={retrying} onClick={retryPayment} className={`inline-flex items-center gap-2 text-white ${widget.classes.button}`} style={widget.styles.primaryButton}><CreditCard className="h-4 w-4" />{retrying ? 'Opening Stripe…' : 'Try payment again'}</button> : null}
      {confirmation.state === 'pending' ? <button type="button" disabled={checking} onClick={() => refresh(false)} className={`inline-flex items-center gap-2 border ${widget.classes.button}`} style={widget.styles.secondaryButton}><RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />{checking ? 'Checking…' : 'Check payment status'}</button> : null}
      <a href={storeBase} className={`inline-flex items-center border no-underline ${widget.classes.button}`} style={widget.styles.secondaryButton}>Continue shopping</a>
      {!positive ? <a href={`${storeBase}/cart`} className={`inline-flex items-center border no-underline ${widget.classes.button}`} style={widget.styles.secondaryButton}>Back to basket</a> : null}
    </div>
  </div>;
}
