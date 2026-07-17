'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FilePlus2, RefreshCw, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CreditNote = { id: string; creditNoteNumber: string; reason: string; totalMinor: number; status: string; issuedAt: string };
type Invoice = { id: string; invoiceNumber: string; orderId: string; orderNumber: string; quoteReference: string; customerName: string; customerEmail: string; customerCompany: string; currency: string; subtotalMinor: number; vatMinor: number; totalMinor: number; creditedMinor: number; status: string; issuedAt: string; paidAt: string; lines: Array<{ id: string; productName: string; quantity: number; netMinor: number; vatRate: number; vatMinor: number; grossMinor: number }>; creditNotes: CreditNote[] };
function money(value: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0) / 100); }
function date(value: string) { try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)); } catch { return value || '—'; } }
function status(value: string) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [orderId, setOrderId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy('load'); setError('');
    try {
      const response = await fetch('/api/internal/invoices?limit=300', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Invoices could not be loaded.');
      const next = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      setItems(next); setSelectedId((current) => current || next[0]?.id || '');
    } catch (next) { setError(next instanceof Error ? next.message : 'Invoices could not be loaded.'); }
    finally { setBusy(''); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => { const term = search.toLowerCase().trim(); return term ? items.filter((item) => [item.invoiceNumber, item.orderNumber, item.customerName, item.customerEmail, item.customerCompany, item.status].join(' ').toLowerCase().includes(term)) : items; }, [items, search]);
  const selected = items.find((item) => item.id === selectedId) || filtered[0] || null;
  const metrics = useMemo(() => ({ count: items.length, gross: items.reduce((sum, item) => sum + item.totalMinor, 0), vat: items.reduce((sum, item) => sum + item.vatMinor, 0), credited: items.reduce((sum, item) => sum + item.creditedMinor, 0) }), [items]);

  async function syncOrder() {
    if (!orderId.trim()) return;
    setBusy('sync'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/internal/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: orderId.trim() }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Invoice could not be created.');
      setNotice(payload?.data?.duplicate ? 'The order already has a formal invoice.' : 'Formal invoice created from the paid order.');
      setOrderId(''); await load();
    } catch (next) { setError(next instanceof Error ? next.message : 'Invoice could not be created.'); }
    finally { setBusy(''); }
  }

  async function createCredit() {
    if (!selected) return;
    setBusy('credit'); setError(''); setNotice('');
    try {
      const amountMinor = creditAmount.trim() ? Math.round(Number(creditAmount) * 100) : 0;
      const response = await fetch(`/api/internal/invoices/${encodeURIComponent(selected.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-credit-note', amountMinor, reason: creditReason.trim() }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Credit note could not be created.');
      setNotice(`Credit note ${payload?.data?.creditNote?.creditNoteNumber || ''} created.`); setCreditAmount(''); setCreditReason(''); await load();
    } catch (next) { setError(next instanceof Error ? next.message : 'Credit note could not be created.'); }
    finally { setBusy(''); }
  }

  return <div className="space-y-5">
    <PageHeader title="Invoices & Credit Notes" subtitle="Immutable paid-order invoices, mixed VAT breakdowns, payment receipts and refund credit notes." actions={<Button onClick={() => void load()} disabled={busy === 'load'}><RefreshCw size={14} />Refresh</Button>} />
    {notice ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}
    {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Invoices" value={String(metrics.count)} /><Metric label="Gross issued" value={money(metrics.gross)} /><Metric label="VAT issued" value={money(metrics.vat)} /><Metric label="Credited" value={money(metrics.credited)} /></div>
    <Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Paid order ID or order number" /><PrimaryButton onClick={() => void syncOrder()} disabled={!orderId.trim() || busy === 'sync'}><FilePlus2 size={14} />Issue from paid order</PrimaryButton></div><p className="mt-2 text-xs text-textMuted">Stripe-confirmed payments issue invoices automatically. This control backfills older paid orders safely and will not create duplicates.</p></Card>
    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <Card className="space-y-4"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, order or customer" /><div className="space-y-2">{filtered.map((invoice) => <button key={invoice.id} onClick={() => setSelectedId(invoice.id)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === invoice.id ? 'border-accent/50 bg-accent/10' : 'border-white/8 bg-panelMuted/40'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{invoice.invoiceNumber}</div><div className="mt-1 font-semibold text-white">{invoice.customerName} · {invoice.orderNumber}</div><div className="mt-1 text-xs text-textMuted">{date(invoice.issuedAt)} · {status(invoice.status)}</div></div><div className="text-right"><div className="font-semibold text-white">{money(invoice.totalMinor, invoice.currency)}</div><div className="text-xs text-textMuted">VAT {money(invoice.vatMinor, invoice.currency)}</div></div></div></button>)}{!filtered.length ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">No formal invoices found.</div> : null}</div></Card>
      <Card className="space-y-4">{selected ? <><div><div className="text-xs uppercase tracking-[0.18em] text-accent">{selected.invoiceNumber}</div><h2 className="mt-2 text-xl font-semibold text-white">{selected.customerName}</h2><p className="mt-1 text-sm text-textMuted">{selected.customerEmail || 'No email'} · {selected.orderNumber}</p></div><div className="grid grid-cols-2 gap-3"><Box label="Net" value={money(selected.subtotalMinor, selected.currency)} /><Box label="VAT" value={money(selected.vatMinor, selected.currency)} /><Box label="Gross" value={money(selected.totalMinor, selected.currency)} /><Box label="Credited" value={money(selected.creditedMinor, selected.currency)} /></div><div className="flex flex-wrap gap-2"><a href={`/api/internal/invoices/${encodeURIComponent(selected.id)}/document`} target="_blank"><PrimaryButton type="button"><Download size={14} />VAT invoice PDF</PrimaryButton></a><a href={`/api/internal/invoices/${encodeURIComponent(selected.id)}/document?type=receipt`} target="_blank"><Button type="button"><Download size={14} />Receipt PDF</Button></a></div><div className="rounded-2xl border border-white/8 p-4"><h3 className="text-sm font-semibold text-white">Create credit note</h3><div className="mt-3 grid gap-3"><Input type="number" step="0.01" min="0" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="Amount in GBP (blank = full remaining)" /><Input value={creditReason} onChange={(event) => setCreditReason(event.target.value)} placeholder="Reason for credit / refund" /><Button onClick={() => void createCredit()} disabled={busy === 'credit' || selected.creditedMinor >= selected.totalMinor}><RotateCcw size={14} />Issue credit note</Button></div></div><div><h3 className="text-sm font-semibold text-white">Credit notes</h3><div className="mt-3 space-y-2">{selected.creditNotes.map((note) => <div key={note.id} className="rounded-xl border border-white/8 p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white">{note.creditNoteNumber}</div><div className="text-xs text-textMuted">{note.reason} · {date(note.issuedAt)}</div></div><a href={`/api/internal/invoices/${encodeURIComponent(selected.id)}/credit-notes/${encodeURIComponent(note.id)}/document`} target="_blank" className="text-xs font-semibold text-accent">PDF</a></div></div>)}{!selected.creditNotes.length ? <p className="text-sm text-textMuted">No credit notes issued.</p> : null}</div></div></> : <p className="text-sm text-textMuted">Select an invoice.</p>}</Card>
    </div>
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Box({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 p-3"><div className="text-xs text-textMuted">{label}</div><div className="mt-1 font-semibold text-white">{value}</div></div>; }
