'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard, FileDown, XCircle } from 'lucide-react';

type Line = { id: string; productName: string; description: string; quantity: number; unitNetMinor: number; netMinor: number; vatRate: number; vatMinor: number; grossMinor: number; selectedOptions: Array<{ key: string; label: string; value: string }> };
type Quote = { id: string; quoteNumber: string; title: string; status: string; currency: string; customerName: string; customerCompany: string; subtotalMinor: number; vatMinor: number; totalMinor: number; customerNotes: string; expiresAt: string; revision: number; convertedOrderId: string; lines: Line[] };
function money(value: number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(Number(value || 0) / 100); }
function label(value: string) { return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function date(value: string) { try { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(value)) : 'Not set'; } catch { return value || 'Not set'; } }

export default function CustomerQuoteClient({ tenantSlug, storeSlug, token, quote, documentUrl }: { tenantSlug: string; storeSlug: string; token: string; quote: Quote; documentUrl: string }) {
  const [current, setCurrent] = useState(quote);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const canApprove = ['sent', 'viewed', 'approved', 'converted'].includes(current.status) && current.totalMinor > 0;
  const canDecline = ['sent', 'viewed', 'approved'].includes(current.status);
  const paid = current.status === 'paid';

  async function action(next: 'approve' | 'decline' | 'pay') {
    setBusy(next); setError('');
    try {
      const response = await fetch(`/api/native-storefront/quotes/${encodeURIComponent(current.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, token, action: next, note }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Quote action failed.');
      if (payload.data) setCurrent(payload.data);
      if (payload.paymentUrl) window.location.assign(payload.paymentUrl);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Quote action failed.'); }
    finally { setBusy(''); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <div className="rounded-[28px] border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Formal quotation</div><h1 className="mt-3 text-[38px] font-black tracking-[-0.055em]">{current.title}</h1><p className="mt-2 text-sm text-slate-500">{current.quoteNumber} · Revision {current.revision} · Expires {date(current.expiresAt)}</p></div><span className="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]">{label(current.status)}</span></div>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-[11px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="py-3 pr-4">Item</th><th>Qty</th><th>Unit net</th><th>VAT</th><th className="text-right">Total</th></tr></thead><tbody className="divide-y">{current.lines.map((line) => <tr key={line.id}><td className="py-5 pr-4"><div className="font-black">{line.productName}</div>{line.description ? <div className="mt-1 text-xs text-slate-500">{line.description}</div> : null}{line.selectedOptions?.length ? <div className="mt-2 text-xs text-slate-500">{line.selectedOptions.map((item) => `${item.label}: ${item.value}`).join(' · ')}</div> : null}</td><td>{line.quantity}</td><td>{money(line.unitNetMinor, current.currency)}</td><td>{line.vatRate}%</td><td className="text-right font-black">{money(line.grossMinor, current.currency)}</td></tr>)}</tbody></table></div>
      {current.customerNotes ? <div className="mt-6 rounded-[18px] bg-slate-50 p-4 text-sm leading-7"><strong>Notes:</strong> {current.customerNotes}</div> : null}
    </div>
    <aside className="h-fit rounded-[28px] border bg-white p-6 shadow-sm" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
      <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(current.subtotalMinor, current.currency)}</strong></div><div className="flex justify-between"><span className="text-slate-500">VAT</span><strong>{money(current.vatMinor, current.currency)}</strong></div><div className="flex justify-between border-t pt-4 text-xl"><span className="font-black">Total</span><strong>{money(current.totalMinor, current.currency)}</strong></div></div>
      <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-black no-underline" style={{ color: 'var(--storefront-ink, #111827)' }}><FileDown className="h-4 w-4" />Print / Save PDF</a>
      {paid ? <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" />Quote accepted and paid</div><p className="mt-2 leading-6">Your order is now linked to this accepted quotation.</p></div> : null}
      {!paid && current.totalMinor <= 0 ? <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your request has been received. The store is preparing the final line prices and VAT before sending it for approval.</div> : null}
      {!paid && canApprove ? <><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Optional note to the store" className="mt-5 w-full rounded-xl border px-3 py-3 text-sm" /><button disabled={Boolean(busy)} onClick={() => action(current.status === 'converted' ? 'pay' : 'approve')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}><CreditCard className="h-4 w-4" />{busy ? 'Preparing…' : current.status === 'converted' ? 'Continue to payment' : 'Approve and pay'}</button></> : null}
      {!paid && canDecline ? <button disabled={Boolean(busy)} onClick={() => action('decline')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Decline quotation</button> : null}
      {current.status === 'declined' ? <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm text-red-900">This quotation was declined. Contact the store for a revised quote.</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    </aside>
  </div>;
}
