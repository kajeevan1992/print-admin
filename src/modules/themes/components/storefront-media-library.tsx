'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Clipboard, ImagePlus, Library, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Input } from '@/components/forms/input';
import type { StorefrontMediaAsset, StorefrontMediaState } from '@/modules/themes/types';
import { storefrontMediaService } from '@/services/storefront-media.service';

type PickerRequest = { currentUrl: string; onSelect: (asset: StorefrontMediaAsset) => void } | null;

type MediaContextValue = {
  storeSlug: string;
  state: StorefrontMediaState | null;
  assets: StorefrontMediaAsset[];
  loading: boolean;
  working: boolean;
  error: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  upload: (file: File, input: { label?: string; altText?: string }) => Promise<StorefrontMediaAsset>;
  update: (assetId: string, input: { label?: string; altText?: string }) => Promise<StorefrontMediaAsset>;
  remove: (asset: StorefrontMediaAsset) => Promise<void>;
  openPicker: (currentUrl: string, onSelect: (asset: StorefrontMediaAsset) => void) => void;
};

const StorefrontMediaContext = createContext<MediaContextValue | null>(null);

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function cleanError(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function MediaPickerModal({ request, assets, loading, onClose }: { request: NonNullable<PickerRequest>; assets: StorefrontMediaAsset[]; loading: boolean; onClose: () => void }) {
  return <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Choose storefront image">
    <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><Library className="h-4 w-4 text-accent" />Choose storefront image</div><p className="mt-1 text-[11px] text-textMuted">Select an uploaded image or close this window to keep the current URL.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-textMuted hover:text-white" aria-label="Close image picker"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-textMuted"><Loader2 className="h-4 w-4 animate-spin" />Loading images…</div> : null}
        {!loading && !assets.length ? <div className="rounded-xl border border-dashed border-white/12 p-10 text-center text-sm text-textMuted">No images have been uploaded for this storefront yet. Close this picker and use the media library upload form.</div> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => {
          const selected = request.currentUrl === asset.url;
          return <button key={asset.id} type="button" onClick={() => { request.onSelect(asset); onClose(); }} className={`overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:border-accent/70 ${selected ? 'border-accent bg-accent/10' : 'border-white/8 bg-panelMuted/70'}`}>
            <div className="aspect-[4/3] bg-black/20"><img src={asset.url} alt={asset.altText || asset.label || asset.filename} className="h-full w-full object-cover" /></div>
            <div className="p-3"><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-[12px] font-semibold text-white">{asset.label || asset.filename}</span>{selected ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}</div><div className="mt-1 text-[10px] text-textMuted">{formatBytes(asset.sizeBytes)}</div></div>
          </button>;
        })}</div>
      </div>
    </div>
  </div>;
}

export function StorefrontMediaProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const [state, setState] = useState<StorefrontMediaState | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerRequest>(null);

  const refresh = useCallback(async () => {
    if (!storeSlug) { setState(null); return; }
    setLoading(true);
    setError(null);
    try { setState(await storefrontMediaService.list(storeSlug)); }
    catch (cause) { setError(cleanError(cause, 'Failed to load storefront media.')); }
    finally { setLoading(false); }
  }, [storeSlug]);

  useEffect(() => { void refresh(); }, [refresh]);

  const upload = useCallback(async (file: File, input: { label?: string; altText?: string }) => {
    if (!storeSlug) throw new Error('Choose a storefront before uploading media.');
    setWorking(true); setError(null); setNotice(null);
    try {
      const asset = await storefrontMediaService.upload(storeSlug, file, input);
      await refresh();
      setNotice('Image uploaded to this storefront.');
      return asset;
    } catch (cause) {
      const message = cleanError(cause, 'Failed to upload storefront image.');
      setError(message);
      throw cause;
    } finally { setWorking(false); }
  }, [refresh, storeSlug]);

  const update = useCallback(async (assetId: string, input: { label?: string; altText?: string }) => {
    if (!storeSlug) throw new Error('Choose a storefront before updating media.');
    setWorking(true); setError(null); setNotice(null);
    try {
      const asset = await storefrontMediaService.update(storeSlug, assetId, input);
      setState((current) => current ? { ...current, assets: current.assets.map((row) => row.id === asset.id ? asset : row) } : current);
      setNotice('Image details updated.');
      return asset;
    } catch (cause) {
      setError(cleanError(cause, 'Failed to update storefront image.'));
      throw cause;
    } finally { setWorking(false); }
  }, [storeSlug]);

  const remove = useCallback(async (asset: StorefrontMediaAsset) => {
    if (!storeSlug) throw new Error('Choose a storefront before deleting media.');
    setWorking(true); setError(null); setNotice(null);
    try {
      await storefrontMediaService.remove(storeSlug, asset.id);
      setState((current) => current ? { ...current, assets: current.assets.filter((row) => row.id !== asset.id), usage: { count: Math.max(0, current.usage.count - 1), total: Math.max(0, current.usage.total - asset.sizeBytes) } } : current);
      setNotice('Unused image deleted.');
    } catch (cause) {
      setError(cleanError(cause, 'Failed to delete storefront image.'));
      throw cause;
    } finally { setWorking(false); }
  }, [storeSlug]);

  const value = useMemo<MediaContextValue>(() => ({
    storeSlug,
    state,
    assets: state?.assets || [],
    loading,
    working,
    error,
    notice,
    refresh,
    upload,
    update,
    remove,
    openPicker: (currentUrl, onSelect) => setPicker({ currentUrl, onSelect }),
  }), [error, loading, notice, refresh, remove, state, storeSlug, update, upload, working]);

  return <StorefrontMediaContext.Provider value={value}>{children}{picker ? <MediaPickerModal request={picker} assets={value.assets} loading={loading} onClose={() => setPicker(null)} /> : null}</StorefrontMediaContext.Provider>;
}

export function useStorefrontMedia() {
  return useContext(StorefrontMediaContext);
}

export function StorefrontMediaField({ value, onChange, placeholder = 'Upload, choose or paste an image URL' }: { value: unknown; onChange: (value: string) => void; placeholder?: string }) {
  const media = useStorefrontMedia();
  const url = String(value || '');
  return <div className="space-y-2">
    {url ? <div className="relative overflow-hidden rounded-xl border border-white/8 bg-black/20"><img src={url} alt="Selected storefront asset preview" className="h-36 w-full object-cover" /><button type="button" onClick={() => onChange('')} className="absolute right-2 top-2 rounded-lg bg-black/75 p-2 text-white" aria-label="Clear selected image"><X className="h-3.5 w-3.5" /></button></div> : null}
    <div className="flex flex-col gap-2 sm:flex-row"><Input type="url" value={url} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><button type="button" disabled={!media?.storeSlug} onClick={() => media?.openPicker(url, (asset) => onChange(asset.url))} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-4 text-[11px] font-semibold text-accent disabled:opacity-40"><Library className="h-4 w-4" />Choose media</button></div>
  </div>;
}

export function StorefrontMediaLibraryPanel() {
  const media = useStorefrontMedia();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [altText, setAltText] = useState('');
  const [editing, setEditing] = useState<StorefrontMediaAsset | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAltText, setEditAltText] = useState('');
  if (!media?.storeSlug) return null;
  const state = media.state;
  const maximumMb = Math.round((state?.limits.maxFileBytes || 0) / 1024 / 1024);
  const submit = async () => {
    if (!file) return;
    try {
      await media.upload(file, { label, altText });
      setFile(null); setLabel(''); setAltText('');
      const input = document.getElementById('storefront-media-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch {}
  };
  const startEdit = (asset: StorefrontMediaAsset) => { setEditing(asset); setEditLabel(asset.label); setEditAltText(asset.altText); };
  return <section id="storefront-media-library" className="rounded-2xl border border-white/8 bg-panel p-5 shadow-card">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><Library className="h-4 w-4 text-accent" />Storefront media library</div><p className="mt-1 max-w-3xl text-[11px] leading-5 text-textMuted">Upload once, then reuse the image in homepage sections, content pages, social sharing and mega menus. JPEG, PNG, WebP, GIF and AVIF are accepted; SVG is blocked.</p></div>{state ? <div className="rounded-xl bg-panelMuted px-3 py-2 text-[10px] text-textMuted">{state.usage.count}/{state.limits.maxAssets} images · {formatBytes(state.usage.total)}/{formatBytes(state.limits.maxStoreBytes)}</div> : null}</div>
    {media.error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-200">{media.error}</div> : null}
    {media.notice ? <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-200">{media.notice}</div> : null}
    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end"><div><label className="mb-1.5 block text-[11px] text-textMuted">Image file</label><input id="storefront-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block min-h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3 py-2 text-[11px] text-text file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-accent" /></div><div><label className="mb-1.5 block text-[11px] text-textMuted">Library label</label><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Homepage hero" /></div><div><label className="mb-1.5 block text-[11px] text-textMuted">Alternative text</label><Input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for accessibility" /></div><button type="button" disabled={!file || media.working} onClick={() => void submit()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[11px] font-semibold text-white disabled:opacity-40">{media.working ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Upload{maximumMb ? ` · max ${maximumMb} MB` : ''}</button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{media.assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-xl border border-white/8 bg-panelMuted/60"><div className="aspect-[4/3] bg-black/20"><img src={asset.url} alt={asset.altText || asset.label || asset.filename} className="h-full w-full object-cover" /></div><div className="p-3"><div className="truncate text-[12px] font-semibold text-white" title={asset.label || asset.filename}>{asset.label || asset.filename}</div><div className="mt-1 truncate text-[10px] text-textMuted">{asset.filename} · {formatBytes(asset.sizeBytes)}</div><div className="mt-3 flex gap-1.5"><button type="button" onClick={() => startEdit(asset)} className="rounded-lg border border-white/10 p-2 text-textMuted hover:text-white" aria-label="Edit image details"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void navigator.clipboard?.writeText(new URL(asset.url, window.location.origin).toString())} className="rounded-lg border border-white/10 p-2 text-textMuted hover:text-white" aria-label="Copy image URL"><Clipboard className="h-3.5 w-3.5" /></button><button type="button" disabled={media.working} onClick={() => { if (window.confirm(`Delete ${asset.label || asset.filename}? Images still referenced by the storefront cannot be deleted.`)) void media.remove(asset).catch(() => undefined); }} className="ml-auto rounded-lg border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-40" aria-label="Delete image"><Trash2 className="h-3.5 w-3.5" /></button></div></div></article>)}</div>
    {!media.loading && !media.assets.length ? <div className="mt-5 rounded-xl border border-dashed border-white/12 p-8 text-center text-[12px] text-textMuted">No storefront images uploaded yet.</div> : null}
    {editing ? <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-4"><div className="flex items-center justify-between"><div className="text-[12px] font-semibold text-white">Edit image details</div><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/10 p-1.5 text-textMuted"><X className="h-3.5 w-3.5" /></button></div><div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end"><div><label className="mb-1.5 block text-[11px] text-textMuted">Library label</label><Input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} /></div><div><label className="mb-1.5 block text-[11px] text-textMuted">Alternative text</label><Input value={editAltText} onChange={(event) => setEditAltText(event.target.value)} /></div><button type="button" disabled={media.working} onClick={() => void media.update(editing.id, { label: editLabel, altText: editAltText }).then(() => setEditing(null)).catch(() => undefined)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[11px] font-semibold text-white disabled:opacity-40"><Check className="h-4 w-4" />Save details</button></div></div> : null}
  </section>;
}
