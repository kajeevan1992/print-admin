'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type ArtworkUpload = {
  id: string;
  tenantId: string;
  siteId?: string;
  productId?: string;
  orderId?: string;
  quoteId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  pageCount?: number;
  widthMm?: number;
  heightMm?: number;
  fileUrl: string;
  downloadUrl: string;
  preflight?: any;
  reviewStatus?: string;
  reviewNote?: string;
  storageSource?: string;
  migratedFromFile?: boolean;
  createdAt: string;
};

type ProductionTicket = {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  productName?: string;
  productSlug?: string;
  artworkUploadId?: string;
  artworkStatus?: string;
  preflightStatus?: string;
  customerProofStatus?: string;
  handoffState?: string;
  status?: string;
  stage?: string;
  slaRisk?: string;
  dueDate?: string;
  productionNotes?: string;
};

function formatSize(bytes: number) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

function uploadStatus(item: ArtworkUpload) {
  return item.preflight?.preflight?.status || item.reviewStatus || 'unknown';
}

function statusTone(status: string) {
  const value = String(status || '').toLowerCase();
  if (['blocked', 'fail', 'failed', 'replacement-requested', 'preflight-fail', 'changes-requested'].some((key) => value.includes(key))) return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (['warning', 'review', 'pending', 'needs'].some((key) => value.includes(key))) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (['pass', 'passed', 'approved', 'ready'].some((key) => value.includes(key))) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return 'border-white/10 bg-white/[0.04] text-textMuted';
}

function matchingTicket(item: ArtworkUpload, tickets: ProductionTicket[]) {
  return tickets.find((ticket) => {
    if (ticket.artworkUploadId && ticket.artworkUploadId === item.id) return true;
    if (item.orderId && (ticket.orderNumber === item.orderId || ticket.orderId === item.orderId)) return true;
    if (item.productId && ticket.productSlug === item.productId && item.orderId && String(ticket.orderNumber || '').includes(item.orderId)) return true;
    return false;
  }) || null;
}

export function ArtworkUploadsPage() {
  const [items, setItems] = useState<ArtworkUpload[]>([]);
  const [tickets, setTickets] = useState<ProductionTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArtworkUpload | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [uploadsRes, ticketsRes] = await Promise.all([
        fetch('/api/internal/storefront/artwork/uploads', { cache: 'no-store' }),
        fetch('/api/internal/config/production-job-tickets/items', { cache: 'no-store' }).catch(() => null),
      ]);
      const payload = await uploadsRes.json();
      if (!uploadsRes.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to load artwork uploads');
      const ticketPayload = ticketsRes ? await ticketsRes.json().catch(() => null) : null;
      const ticketItems = Array.isArray(ticketPayload?.data?.items) ? ticketPayload.data.items : [];
      setItems(payload?.data?.items || []);
      setTickets(ticketItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artwork uploads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    passed: items.filter((item) => uploadStatus(item) === 'passed' || uploadStatus(item) === 'pass').length,
    warning: items.filter((item) => uploadStatus(item) === 'warning').length,
    blocked: items.filter((item) => uploadStatus(item) === 'blocked' || uploadStatus(item) === 'replacement-requested').length,
    proofing: items.filter((item) => matchingTicket(item, tickets)).length,
  }), [items, tickets]);

  const selectedTicket = selected ? matchingTicket(selected, tickets) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Artwork Uploads"
        subtitle="View, download and inspect customer artwork uploaded from hosted checkout. Checkout uploads now link to production proofing tickets so prepress can see order handoff state."
        actions={<div className="flex flex-wrap gap-2"><a href="/artwork-proofing"><Button>Open Proofing</Button></a><Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button></div>}
      />
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs text-textMuted">Uploads</p><p className="mt-2 text-2xl font-semibold">{stats.total}</p></Card>
        <Card><p className="text-xs text-textMuted">Passed</p><p className="mt-2 text-2xl font-semibold">{stats.passed}</p></Card>
        <Card><p className="text-xs text-textMuted">Warnings</p><p className="mt-2 text-2xl font-semibold">{stats.warning}</p></Card>
        <Card><p className="text-xs text-textMuted">Blocked</p><p className="mt-2 text-2xl font-semibold">{stats.blocked}</p></Card>
        <Card><p className="text-xs text-textMuted">Linked to proofing</p><p className="mt-2 text-2xl font-semibold">{stats.proofing}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-3">
          {loading ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">Loading uploads…</div> : null}
          {!loading && !items.length ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">No artwork uploads yet.</div> : null}
          {items.map((item) => {
            const status = uploadStatus(item);
            const ticket = matchingTicket(item, tickets);
            return (
              <button key={item.id} onClick={() => setSelected(item)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-accent bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/[0.03]"><FileText size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.originalName}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.productId || 'No product'} · {formatSize(item.sizeBytes)} · {item.pageCount || '—'} page(s)</p>
                      <p className="mt-1 text-xs text-textMuted">Order: {item.orderId || 'Not attached'} · {item.widthMm && item.heightMm ? `${item.widthMm} × ${item.heightMm} mm` : 'Size not detected'}</p>
                      <p className="mt-1 text-xs text-textMuted">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(status)}`}>{status}</span>
                    {ticket ? <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(ticket.handoffState || ticket.artworkStatus || '')}`}>Proofing: {ticket.handoffState || ticket.artworkStatus}</span> : <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-textMuted">No proof ticket</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        <Card>
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Selected artwork</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selected.originalName}</h3>
                <p className="mt-1 text-sm text-textMuted">{selected.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">File size</p><p className="mt-1 text-sm font-semibold text-white">{formatSize(selected.sizeBytes)}</p></div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Pages</p><p className="mt-1 text-sm font-semibold text-white">{selected.pageCount || 'Unknown'}</p></div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Width</p><p className="mt-1 text-sm font-semibold text-white">{selected.widthMm ? `${selected.widthMm} mm` : 'Unknown'}</p></div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-textMuted">Height</p><p className="mt-1 text-sm font-semibold text-white">{selected.heightMm ? `${selected.heightMm} mm` : 'Unknown'}</p></div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 text-sm font-semibold text-white">Checkout / proofing handoff</div>
                <p className="text-sm text-textMuted">Order: {selected.orderId || 'Not attached'}</p>
                <p className="mt-1 text-sm text-textMuted">Review: {selected.reviewStatus || 'pending-review'}</p>
                <p className="mt-1 text-sm text-textMuted">Storage: {selected.storageSource || 'file-fallback'}{selected.migratedFromFile ? ' · migrated to DB metadata' : ''}</p>
                {selectedTicket ? <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">Proofing ticket linked</p><p className="mt-1 text-sm text-textMuted">{selectedTicket.orderNumber || selectedTicket.id} · {selectedTicket.artworkStatus || 'artwork-check'} · {selectedTicket.handoffState || 'pending'}</p><p className="mt-1 text-sm text-textMuted">Due: {selectedTicket.dueDate || 'Not set'} · Risk: {selectedTicket.slaRisk || 'medium'}</p></div> : <p className="mt-3 text-sm text-amber-200">No proofing ticket is linked yet. New checkout uploads should create one automatically.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={absoluteUrl(selected.fileUrl)} target="_blank" rel="noreferrer"><Button><Eye size={14} /> View PDF</Button></a>
                <a href={absoluteUrl(selected.downloadUrl)}><Button><Download size={14} /> Download</Button></a>
                <a href="/artwork-proofing"><Button>Open Proofing</Button></a>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={16} /> Preflight result</div>
                <p className="text-sm text-textMuted">Status: {selected.preflight?.preflight?.status || selected.reviewStatus || 'unknown'}</p>
                {(selected.preflight?.preflight?.errors || []).map((msg: string) => <p key={msg} className="mt-2 text-sm text-red-300">• {msg}</p>)}
                {(selected.preflight?.preflight?.warnings || []).map((msg: string) => <p key={msg} className="mt-2 text-sm text-amber-200">• {msg}</p>)}
                {!(selected.preflight?.preflight?.errors || []).length && !(selected.preflight?.preflight?.warnings || []).length ? <p className="mt-2 text-sm text-emerald-200">No blocking issues detected by current basic checks.</p> : null}
              </div>
            </div>
          ) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">Select an upload to view file details, preflight result and proofing handoff.</div>}
        </Card>
      </div>
    </div>
  );
}
