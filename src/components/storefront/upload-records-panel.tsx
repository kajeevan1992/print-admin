'use client';

import { useEffect, useState } from 'react';
import { artworkUploadSeed } from '@/data/artwork-upload-foundation';
import { UploadStatusBadge } from './upload-status-badge';

type ArtworkUpload = Record<string, any>;

function statusFor(file: ArtworkUpload) {
  const status = String(file?.preflight?.preflight?.status || file?.preflight?.status || file?.reviewStatus || '').toLowerCase();
  if (status === 'warning') return 'review';
  if (['fail', 'failed', 'blocked', 'rejected'].includes(status)) return 'rejected';
  if (['pass', 'passed', 'approved'].includes(status)) return 'approved';
  return 'uploaded';
}
function sizeLabel(bytes: unknown) {
  const value = Number(bytes || 0);
  if (!value) return 'size pending';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function whenLabel(value: unknown) {
  const input = String(value || '');
  const date = new Date(input);
  if (!input || Number.isNaN(date.getTime())) return 'recently';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function UploadRecordsPanel() {
  const [orderId, setOrderId] = useState('');
  const [uploads, setUploads] = useState<ArtworkUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(id = orderId) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (id) params.set('orderId', id);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/internal/storefront/artwork/uploads${suffix}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not load artwork uploads.');
      setUploads(Array.isArray(payload.data?.items) ? payload.data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load artwork uploads.');
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId') || params.get('orderNumber') || '';
    setOrderId(id);
    void load(id);
  }, []);

  const showSeed = uploads.length === 0 && !orderId && !error;

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Recent uploads</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{orderId ? `Linked to ${orderId}` : 'Latest artwork records'}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs text-rose-100">{error}</div> : null}

      <div className="mt-4 space-y-3">
        {uploads.map((file) => (
          <div key={file.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{file.originalName || file.fileName || file.id}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{file.mimeType || file.extension || 'Artwork'} · {sizeLabel(file.sizeBytes)} · {whenLabel(file.createdAt)}</p>
              </div>
              <UploadStatusBadge status={statusFor(file) as any} />
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Order: {file.orderId || 'not attached'} · Preflight: {file.preflight?.preflight?.status || file.preflight?.status || file.reviewStatus || 'queued'}</p>
          </div>
        ))}

        {showSeed ? artworkUploadSeed.map((file) => (
          <div key={file.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{file.fileName}</p><p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{file.fileType} · {file.fileSize} · {file.uploadedAt}</p></div><UploadStatusBadge status={file.status} /></div>
            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{file.note}</p>
          </div>
        )) : null}

        {!loading && uploads.length === 0 && !showSeed ? <div className="rounded-2xl border border-dashed p-5 text-center text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>No artwork uploads found yet.</div> : null}
      </div>
    </div>
  );
}
