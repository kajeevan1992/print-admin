'use client';

import { useEffect, useRef, useState } from 'react';

export function UploadDropzoneCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId') || params.get('orderNumber') || '');
    setEmail(params.get('email') || '');
  }, []);

  async function submit() {
    setBusy(true);
    setError('');
    setMessage('');
    setLatest(null);
    try {
      if (!orderId.trim()) throw new Error('Order number is required.');
      if (!file) throw new Error('Choose an artwork file first.');
      const form = new FormData();
      form.set('orderId', orderId);
      form.set('email', email);
      form.set('note', note);
      form.set('file', file, file.name);
      const response = await fetch('/api/native-storefront/artwork-revision', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Artwork upload failed.');
      setLatest(payload.data || null);
      setMessage(payload.data?.message || 'Artwork uploaded and sent for review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-[2rem] border border-dashed p-8 text-left"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="text-center">
        <p className="text-sm font-semibold">Upload artwork</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Upload or replace artwork for an existing order. Files are saved through the live artwork storage and preflight workflow.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
        {['PDF', 'AI', 'EPS', 'PSD', 'JPG', 'PNG'].map((type) => (
          <span
            key={type}
            className="rounded-full px-3 py-1"
            style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            {type}
          </span>
        ))}
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {message ? <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</div> : null}

      <div className="mt-6 grid gap-3 text-sm">
        <input
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          placeholder="Order number"
          className="rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address optional"
          className="rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
        />
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border px-4 py-3 text-left"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
        >
          {file ? file.name : 'Choose artwork file'}
        </button>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for the artwork team"
          className="min-h-[110px] rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-full px-5 py-3 text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
        >
          {busy ? 'Uploading...' : 'Upload artwork'}
        </button>
      </div>

      {latest?.upload ? (
        <div className="mt-5 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
          <p className="font-medium">Latest upload</p>
          <p className="mt-1" style={{ color: 'var(--theme-text-muted)' }}>{latest.upload.originalName || latest.upload.id}</p>
          <p className="mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Preflight: {latest.ticketUpdate?.preflightStatus || 'queued'} · Proof: {latest.ticketUpdate?.customerProofStatus || 'review'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
