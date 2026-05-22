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
  createdAt: string;
};

function formatSize(bytes: number) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export function ArtworkUploadsPage() {
  const [items, setItems] = useState<ArtworkUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArtworkUpload | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/internal/storefront/artwork/uploads', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to load artwork uploads');
      setItems(payload?.data?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artwork uploads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    passed: items.filter((item) => item.preflight?.preflight?.status === 'passed').length,
    warning: items.filter((item) => item.preflight?.preflight?.status === 'warning').length,
    blocked: items.filter((item) => item.preflight?.preflight?.status === 'blocked').length,
  }), [items]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Artwork Uploads"
        subtitle="View, download and inspect customer artwork uploaded from hosted checkout. Files are stored on the admin runtime volume at .data/artwork-uploads. Use persistent storage in Coolify for production."
        actions={<Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button>}
      />
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Uploads</p><p className="mt-2 text-2xl font-semibold">{stats.total}</p></Card>
        <Card><p className="text-xs text-textMuted">Passed</p><p className="mt-2 text-2xl font-semibold">{stats.passed}</p></Card>
        <Card><p className="text-xs text-textMuted">Warnings</p><p className="mt-2 text-2xl font-semibold">{stats.warning}</p></Card>
        <Card><p className="text-xs text-textMuted">Blocked</p><p className="mt-2 text-2xl font-semibold">{stats.blocked}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-3">
          {loading ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">Loading uploads…</div> : null}
          {!loading && !items.length ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">No artwork uploads yet.</div> : null}
          {items.map((item) => {
            const status = item.preflight?.preflight?.status || 'unknown';
            return (
              <button key={item.id} onClick={() => setSelected(item)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-accent bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/[0.03]"><FileText size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.originalName}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.productId || 'No product'} · {formatSize(item.sizeBytes)} · {item.pageCount || '—'} page(s)</p>
                      <p className="mt-1 text-xs text-textMuted">{item.widthMm && item.heightMm ? `${item.widthMm} × ${item.heightMm} mm` : 'Size not detected'} · {new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-textMuted">{status}</span>
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
              <div className="flex flex-wrap gap-2">
                <a href={absoluteUrl(selected.fileUrl)} target="_blank" rel="noreferrer"><Button><Eye size={14} /> View PDF</Button></a>
                <a href={absoluteUrl(selected.downloadUrl)}><Button><Download size={14} /> Download</Button></a>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={16} /> Preflight result</div>
                <p className="text-sm text-textMuted">Status: {selected.preflight?.preflight?.status || 'unknown'}</p>
                {(selected.preflight?.preflight?.errors || []).map((msg: string) => <p key={msg} className="mt-2 text-sm text-red-300">• {msg}</p>)}
                {(selected.preflight?.preflight?.warnings || []).map((msg: string) => <p key={msg} className="mt-2 text-sm text-amber-200">• {msg}</p>)}
                {!(selected.preflight?.preflight?.errors || []).length && !(selected.preflight?.preflight?.warnings || []).length ? <p className="mt-2 text-sm text-emerald-200">No blocking issues detected by current basic checks.</p> : null}
              </div>
            </div>
          ) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-textMuted">Select an upload to view file details, preflight result and download links.</div>}
        </Card>
      </div>
    </div>
  );
}
