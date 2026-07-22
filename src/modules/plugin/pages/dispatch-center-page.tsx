'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ClipboardCheck, ExternalLink, MapPinned, PackageCheck, Printer, RefreshCw, ScanLine, Search, Send, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';

type ShipmentStatus = 'ready' | 'manifested' | 'collection-ready' | 'dispatched' | 'in-transit' | 'exception' | 'delivered' | 'collected' | 'cancelled';
type Shipment = {
  id: string; storeSlug: string; productionJobId: string; plannerJobId: string; orderNumber: string; customerName: string; customerEmail: string; customerPhone: string; productName: string; quantity: number; fulfilmentMode: string; carrier: string; service: string; trackingNumber: string; trackingUrl: string; manifestNumber: string; packageCount: number; weightGrams: number; status: ShipmentStatus; scanStatus: string; destination: Record<string, string>; destinationLabel: string; sender: Record<string, string>; release: Record<string, any>; notes: string; manifestedAt: string; dispatchedAt: string; deliveredAt: string; notificationSentAt: string; updatedAt: string;
  events: Array<{ id: string; status: string; label: string; note: string; source: string; actorLabel: string; occurredAt: string }>;
};
type DispatchData = { stores: Array<{ slug: string; name: string }>; selectedStore: { slug: string; name: string }; items: Shipment[]; heldByArtworkGate: number; heldByPaymentGate: number };

const columns: Array<{ key: string; title: string; statuses: ShipmentStatus[] }> = [
  { key: 'ready', title: 'Ready / Manifest', statuses: ['ready', 'manifested', 'collection-ready'] },
  { key: 'handover', title: 'Carrier Handover', statuses: ['dispatched', 'in-transit'] },
  { key: 'exception', title: 'Exceptions', statuses: ['exception'] },
  { key: 'complete', title: 'Complete', statuses: ['delivered', 'collected', 'cancelled'] },
];

function clean(value: unknown) { return String(value || '').trim(); }
function formatDate(value: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB'); }
function formatWeight(value: number) { return value ? value >= 1000 ? `${(value / 1000).toFixed(2)} kg` : `${value} g` : 'not set'; }
function statusTone(status: string) { if (['delivered', 'collected'].includes(status)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'; if (status === 'exception' || status === 'cancelled') return 'border-rose-500/30 bg-rose-500/10 text-rose-200'; if (['dispatched', 'in-transit'].includes(status)) return 'border-violet-500/30 bg-violet-500/10 text-violet-200'; return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'; }
function paymentReady(item: Shipment) { return item.release?.paymentReleased === true; }
function proofReady(item: Shipment) { return item.release?.proofReleased === true; }

export function DispatchCenterPage() {
  const [data, setData] = useState<DispatchData | null>(null);
  const [storeSlug, setStoreSlug] = useState('');
  const [search, setSearch] = useState('');
  const [carrier, setCarrier] = useState('all');
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load(requestedStore = storeSlug) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(); if (requestedStore) params.set('storeSlug', requestedStore);
      const response = await fetch(`/api/internal/dispatch/shipments${params.toString() ? `?${params}` : ''}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Dispatch shipments could not load.');
      const next = payload.data as DispatchData;
      setData(next); setStoreSlug(next.selectedStore?.slug || requestedStore || next.stores[0]?.slug || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dispatch shipments could not load.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(''); }, []);
  const items = data?.items || [];
  const carriers = useMemo(() => ['all', ...Array.from(new Set(items.map((item) => item.carrier).filter(Boolean)))], [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.orderNumber} ${item.customerName} ${item.customerEmail} ${item.productName} ${item.carrier} ${item.service} ${item.trackingNumber} ${item.manifestNumber} ${item.destinationLabel}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (carrier === 'all' || item.carrier === carrier);
  }), [items, search, carrier]);
  const stats = useMemo(() => ({ total: filtered.length, ready: filtered.filter((item) => columns[0].statuses.includes(item.status)).length, handed: filtered.filter((item) => columns[1].statuses.includes(item.status)).length, exceptions: filtered.filter((item) => item.status === 'exception').length, complete: filtered.filter((item) => ['delivered', 'collected'].includes(item.status)).length, scanBlocked: filtered.filter((item) => item.scanStatus !== 'complete' && !['delivered', 'collected', 'cancelled'].includes(item.status)).length }), [filtered]);

  async function post(body: Record<string, any>) {
    setWorking(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/internal/dispatch/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeSlug, ...body }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Shipment update failed.');
      const notification = payload.notification;
      setNotice(notification?.attempted ? notification.sent ? 'Shipment updated and customer notification queued.' : `Shipment updated, but email was not sent: ${notification.message}` : 'Shipment updated.');
      await load(storeSlug);
      return payload;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shipment update failed.'); return null; }
    finally { setWorking(false); }
  }

  async function save() {
    if (!editing) return;
    const payload = await post({ action: 'save', shipmentId: editing.id, carrier: editing.carrier, service: editing.service, trackingNumber: editing.trackingNumber, trackingUrl: editing.trackingUrl, manifestNumber: editing.manifestNumber, packageCount: editing.packageCount, weightGrams: editing.weightGrams, scanStatus: editing.scanStatus, destination: editing.destination, sender: editing.sender, notes: editing.notes });
    if (payload) setEditing(null);
  }

  async function run(item: Shipment, action: string) {
    let note = '';
    if (action === 'exception') { note = window.prompt('Describe the dispatch exception:') || ''; if (!note.trim()) return; }
    if (action === 'cancel' && !window.confirm(`Cancel shipment for ${item.orderNumber}?`)) return;
    await post({ action, shipmentId: item.id, note, sendNotification: ['dispatch', 'collection-ready', 'collected', 'in-transit', 'exception', 'delivered'].includes(action) });
  }

  function actionButtons(item: Shipment) {
    const collection = item.fulfilmentMode === 'collection' || item.service === 'collection';
    return <>
      <Button onClick={() => setEditing(item)}>Edit</Button>
      <a href={`/api/internal/dispatch/shipments/${encodeURIComponent(item.id)}/label?storeSlug=${encodeURIComponent(storeSlug)}`} target="_blank" rel="noreferrer"><Button><Printer size={14} /> Label</Button></a>
      {item.status === 'ready' && !collection ? <Button disabled={working} onClick={() => void run(item, 'manifest')}><ClipboardCheck size={14} /> Manifest</Button> : null}
      {item.status === 'ready' && collection ? <PrimaryButton disabled={working} onClick={() => void run(item, 'collection-ready')}><PackageCheck size={14} /> Ready collection</PrimaryButton> : null}
      {['ready', 'manifested'].includes(item.status) && !collection ? <PrimaryButton disabled={working || !paymentReady(item) || !proofReady(item)} onClick={() => void run(item, 'dispatch')}><Send size={14} /> Dispatch</PrimaryButton> : null}
      {item.status === 'collection-ready' ? <PrimaryButton disabled={working} onClick={() => void run(item, 'collected')}><CheckCircle2 size={14} /> Collected</PrimaryButton> : null}
      {['dispatched', 'exception'].includes(item.status) ? <Button disabled={working} onClick={() => void run(item, 'in-transit')}><Truck size={14} /> In transit</Button> : null}
      {['dispatched', 'in-transit', 'exception'].includes(item.status) ? <PrimaryButton disabled={working} onClick={() => void run(item, 'delivered')}><CheckCircle2 size={14} /> Delivered</PrimaryButton> : null}
      {!['delivered', 'collected', 'cancelled'].includes(item.status) ? <Button disabled={working} onClick={() => void run(item, 'exception')}><AlertTriangle size={14} /> Exception</Button> : null}
      {item.customerEmail ? <Button disabled={working} onClick={() => void post({ action: 'notify', shipmentId: item.id })}><Bell size={14} /> Notify</Button> : null}
    </>;
  }

  return <div className="space-y-6">
    <PageHeader title="Shipment & Dispatch Center" subtitle="Persistent shipment records, proof/payment release gates, labels, customer notifications and delivery timelines." actions={<><a href="/production"><Button>Production</Button></a><Button disabled={loading} onClick={() => void load(storeSlug)}><RefreshCw size={14} /> Refresh</Button></>} />
    {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
    {notice ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8"><Card><p className="text-xs uppercase text-textMuted">Shipments</p><p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p></Card><Card><p className="text-xs uppercase text-textMuted">Ready</p><p className="mt-2 text-3xl font-semibold text-white">{stats.ready}</p></Card><Card><p className="text-xs uppercase text-textMuted">Handover</p><p className="mt-2 text-3xl font-semibold text-white">{stats.handed}</p></Card><Card><p className="text-xs uppercase text-textMuted">Exceptions</p><p className="mt-2 text-3xl font-semibold text-white">{stats.exceptions}</p></Card><Card><p className="text-xs uppercase text-textMuted">Complete</p><p className="mt-2 text-3xl font-semibold text-white">{stats.complete}</p></Card><Card><p className="text-xs uppercase text-textMuted">Scan blockers</p><p className="mt-2 text-3xl font-semibold text-white">{stats.scanBlocked}</p></Card><Card><p className="text-xs uppercase text-textMuted">Proof held</p><p className="mt-2 text-3xl font-semibold text-white">{data?.heldByArtworkGate || 0}</p></Card><Card><p className="text-xs uppercase text-textMuted">Payment held</p><p className="mt-2 text-3xl font-semibold text-white">{data?.heldByPaymentGate || 0}</p></Card></div>
    <Card className="border-cyan-500/20 bg-cyan-500/5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Authoritative dispatch feed</p><p className="mt-2 text-sm text-textMuted">Only proof-approved and paid production work at packing/dispatch enters this queue. Browser-local demo batches are no longer used.</p></div><span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">Tenant secured · PostgreSQL</span></div></Card>
    <Card><div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px]"><Select value={storeSlug} options={(data?.stores || []).map((store) => ({ value: store.slug, label: store.name }))} onChange={(event) => { setStoreSlug(event.target.value); void load(event.target.value); }} /><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, product, tracking or destination…" /></div><Select value={carrier} options={carriers} onChange={(event) => setCarrier(event.target.value)} /></div></Card>
    {loading ? <Card>Loading released shipments…</Card> : <div className="grid gap-4 2xl:grid-cols-4">{columns.map((column) => <Card key={column.key} className="overflow-hidden p-0"><div className="border-b border-white/8 px-4 py-3"><h3 className="font-semibold text-white">{column.title}</h3><p className="text-xs text-textMuted">{filtered.filter((item) => column.statuses.includes(item.status)).length} shipments</p></div><div className="space-y-3 p-3">{filtered.filter((item) => column.statuses.includes(item.status)).map((item) => <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{item.orderNumber}</p><p className="mt-1 text-xs text-textMuted">{item.productName} · Qty {item.quantity}</p><p className="mt-1 text-xs text-textMuted">{item.customerName || 'Customer'} · {item.customerEmail || 'email not set'}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(item.status)}`}>{item.status.replace(/-/g, ' ')}</span></div><div className="mt-3 space-y-1.5 text-xs text-textMuted"><p className="flex gap-2"><Truck size={14} /> {item.carrier} · {item.service}</p><p className="flex gap-2"><ScanLine size={14} /> Scan {item.scanStatus} · {item.packageCount} package(s)</p><p className="flex gap-2"><MapPinned size={14} /> {item.destinationLabel || (item.fulfilmentMode === 'collection' ? 'Store collection' : 'Address not set')}</p><p>Tracking: {item.trackingNumber || 'not set'} · Weight {formatWeight(item.weightGrams)}</p><p>Proof {proofReady(item) ? 'released' : 'held'} · Payment {paymentReady(item) ? 'released' : 'held'}</p></div>{item.notes ? <p className="mt-3 rounded-xl border border-white/8 bg-black/20 p-2 text-xs text-textMuted">{item.notes}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{actionButtons(item)}</div>{item.events?.length ? <details className="mt-3"><summary className="cursor-pointer text-xs text-cyan-200">Shipment timeline ({item.events.length})</summary><div className="mt-2 space-y-2">{item.events.slice().reverse().map((event) => <div key={event.id} className="rounded-lg border border-white/8 bg-black/10 p-2 text-xs text-textMuted"><p className="font-semibold text-white">{event.label}</p><p>{formatDate(event.occurredAt)} · {event.actorLabel || event.source}</p>{event.note ? <p className="mt-1">{event.note}</p> : null}</div>)}</div></details> : null}</div>)}{!filtered.some((item) => column.statuses.includes(item.status)) ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-textMuted">No shipments in this stage.</div> : null}</div></Card>)}</div>}
    <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Shipment ${editing.orderNumber}` : 'Shipment'}>{editing ? <div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Select value={editing.carrier} options={['DPD', 'DHL', 'Royal Mail', 'UPS', 'Other', 'Collection']} onChange={(event) => setEditing({ ...editing, carrier: event.target.value })} /><Select value={editing.service} options={['next-day', 'tracked-24', 'tracked-48', 'economy', 'same-day', 'collection', 'other']} onChange={(event) => setEditing({ ...editing, service: event.target.value })} /><Input value={editing.trackingNumber} onChange={(event) => setEditing({ ...editing, trackingNumber: event.target.value })} placeholder="Tracking number" /><Input value={editing.trackingUrl} onChange={(event) => setEditing({ ...editing, trackingUrl: event.target.value })} placeholder="HTTPS carrier tracking URL" /><Input value={editing.manifestNumber} onChange={(event) => setEditing({ ...editing, manifestNumber: event.target.value })} placeholder="Manifest number" /><Input type="number" min="1" value={editing.packageCount} onChange={(event) => setEditing({ ...editing, packageCount: Number(event.target.value) || 1 })} placeholder="Package count" /><Input type="number" min="0" value={editing.weightGrams} onChange={(event) => setEditing({ ...editing, weightGrams: Number(event.target.value) || 0 })} placeholder="Weight grams" /><Select value={editing.scanStatus} options={['complete', 'partial', 'missing']} onChange={(event) => setEditing({ ...editing, scanStatus: event.target.value })} /></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">Delivery address</p><div className="grid gap-3 md:grid-cols-2"><Input value={editing.destination.recipientName || editing.customerName} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, recipientName: event.target.value } })} placeholder="Recipient" /><Input value={editing.destination.company || ''} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, company: event.target.value } })} placeholder="Company" /><Input value={editing.destination.line1 || editing.destination.address1 || ''} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, line1: event.target.value } })} placeholder="Address line 1" /><Input value={editing.destination.line2 || editing.destination.address2 || ''} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, line2: event.target.value } })} placeholder="Address line 2" /><Input value={editing.destination.town || editing.destination.city || ''} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, town: event.target.value } })} placeholder="Town / city" /><Input value={editing.destination.postcode || ''} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, postcode: event.target.value } })} placeholder="Postcode" /><Input value={editing.destination.country || 'United Kingdom'} onChange={(event) => setEditing({ ...editing, destination: { ...editing.destination, country: event.target.value } })} placeholder="Country" /></div></div><Input value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} placeholder="Dispatch notes" /><div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton disabled={working} onClick={() => void save()}>Save shipment</PrimaryButton></div></div> : null}</BaseModal>
  </div>;
}
