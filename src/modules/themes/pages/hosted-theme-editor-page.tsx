'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type ThemeSettings = {
  channelSlug: string;
  status: string;
  brand: Record<string, string>;
  layout: Record<string, any>;
  sections: Record<string, any>[];
  contentOverrides: Record<string, any>;
  navigation: Record<string, any>[];
  draftVersion: number;
  publishedVersion: number;
  updatedAt: string;
  publishedAt: string;
};
const defaultBrand = { brandName: 'HOLO Print', logoUrl: '', primary: '#18a7d0', accent: '#111827', background: '#ffffff', text: '#111827' };
const defaultContentOverrides = {
  selectors: {},
  text: {
    'Professional print, same day printing, signage and packaging solutions': 'Professional print, same day printing, signage and packaging solutions'
  },
  images: {},
  attributes: {}
};

export function HostedThemeEditorPage() {
  const [channelSlug, setChannelSlug] = useState('default-store');
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [contentText, setContentText] = useState(JSON.stringify(defaultContentOverrides, null, 2));
  const [navigationText, setNavigationText] = useState('[]');
  const [message, setMessage] = useState('Loading Site Designer...');
  const [busy, setBusy] = useState(false);

  async function load(slug = channelSlug) {
    setBusy(true);
    try {
      const res = await fetch(`/api/internal/hosted-theme-editor?channelSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load Site Designer settings.');
      const next = payload.data.settings;
      setSettings(next);
      setContentText(JSON.stringify(next.contentOverrides || defaultContentOverrides, null, 2));
      setNavigationText(JSON.stringify(next.navigation || [], null, 2));
      setMessage('Site Designer draft loaded. Layout remains locked to the uploaded hosted theme.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load Site Designer settings.');
    } finally {
      setBusy(false);
    }
  }
  function brandChange(key: string, value: string) {
    setSettings((prev) => prev ? { ...prev, brand: { ...(prev.brand || defaultBrand), [key]: value } } : prev);
  }
  function layoutChange(key: string, value: boolean) {
    setSettings((prev) => prev ? { ...prev, layout: { ...(prev.layout || {}), [key]: value, takeoverHomepage: false, lockUploadedThemeLayout: true } } : prev);
  }
  function syncJson() {
    if (!settings) return;
    try {
      const contentOverrides = JSON.parse(contentText || '{}');
      const navigation = JSON.parse(navigationText || '[]');
      if (!contentOverrides || typeof contentOverrides !== 'object' || Array.isArray(contentOverrides)) throw new Error('Content overrides must be an object.');
      if (!Array.isArray(navigation)) throw new Error('Navigation must be an array.');
      setSettings({ ...settings, contentOverrides, navigation, layout: { ...(settings.layout || {}), takeoverHomepage: false, lockUploadedThemeLayout: true } });
      setMessage('Override JSON synced.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Override JSON is invalid.');
    }
  }
  async function save(action: 'draft' | 'publish' = 'draft') {
    if (!settings) return;
    setBusy(true);
    try {
      let contentOverrides = settings.contentOverrides || defaultContentOverrides;
      let navigation = settings.navigation || [];
      try {
        const parsedContent = JSON.parse(contentText || '{}');
        if (parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)) contentOverrides = parsedContent;
      } catch {}
      try {
        const parsedNavigation = JSON.parse(navigationText || '[]');
        if (Array.isArray(parsedNavigation)) navigation = parsedNavigation;
      } catch {}
      const body = action === 'publish'
        ? { ...settings, action: 'publish', channelSlug: settings.channelSlug, contentOverrides, navigation, layout: { ...(settings.layout || {}), takeoverHomepage: false, lockUploadedThemeLayout: true } }
        : { ...settings, contentOverrides, navigation, layout: { ...(settings.layout || {}), takeoverHomepage: false, lockUploadedThemeLayout: true }, sections: [] };
      const res = await fetch('/api/internal/hosted-theme-editor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save Site Designer settings.');
      setSettings(payload.data.settings);
      setContentText(JSON.stringify(payload.data.settings.contentOverrides || defaultContentOverrides, null, 2));
      setNavigationText(JSON.stringify(payload.data.settings.navigation || [], null, 2));
      setMessage(action === 'publish' ? 'Site Designer changes published.' : 'Site Designer draft saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save Site Designer settings.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { void load('default-store'); }, []);
  const brand = settings?.brand || defaultBrand;
  return <div className="space-y-4"><PageHeader title="Site Designer" subtitle="Edit the uploaded hosted theme safely. Layout and component structure stay locked; only brand, content, images and navigation overrides change." actions={<><Button onClick={() => void load()} disabled={busy}>Refresh</Button><Button onClick={() => void save('draft')} disabled={busy || !settings}>Save draft</Button><PrimaryButton onClick={() => void save('publish')} disabled={busy || !settings}>Publish</PrimaryButton></>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={channelSlug} onChange={(event) => setChannelSlug(event.target.value)} placeholder="Store/channel slug" /><Button onClick={() => void load(channelSlug)} disabled={busy}>Load store</Button></div><p className="mt-2 text-xs text-textMuted">This edits the selected store's hosted theme override layer. It does not replace the uploaded theme layout.</p></Card><div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><Card><h3 className="mb-3 text-sm font-semibold text-white">Brand settings</h3><div className="grid gap-3"><Input value={brand.brandName || ''} onChange={(e) => brandChange('brandName', e.target.value)} placeholder="Brand name" /><Input value={brand.logoUrl || ''} onChange={(e) => brandChange('logoUrl', e.target.value)} placeholder="Logo URL" /><Input value={brand.primary || '#18a7d0'} onChange={(e) => brandChange('primary', e.target.value)} placeholder="#18a7d0" /><Input value={brand.accent || '#111827'} onChange={(e) => brandChange('accent', e.target.value)} placeholder="#111827" /><Input value={brand.background || '#ffffff'} onChange={(e) => brandChange('background', e.target.value)} placeholder="#ffffff" /><Input value={brand.text || '#111827'} onChange={(e) => brandChange('text', e.target.value)} placeholder="#111827" /></div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Preview summary</h3><div className="rounded-xl border border-white/10 p-4" style={{ background: brand.background || '#fff', color: brand.text || '#111827' }}><p className="text-xs uppercase opacity-70">{settings?.channelSlug || 'default-store'} · {settings?.status || 'draft'}</p><h2 className="mt-2 text-2xl font-black" style={{ color: brand.primary || '#18a7d0' }}>{brand.brandName || 'Brand name'}</h2><p className="mt-2">Uploaded theme layout locked. Draft v{settings?.draftVersion || 0}, published v{settings?.publishedVersion || 0}.</p></div><div className="mt-4 grid gap-2 text-sm text-textMuted"><label><input type="checkbox" checked={settings?.layout?.showSearch !== false} onChange={(e) => layoutChange('showSearch', e.target.checked)} /> Show storefront search</label><label><input type="checkbox" checked={settings?.layout?.showCollectionPoints !== false} onChange={(e) => layoutChange('showCollectionPoints', e.target.checked)} /> Show collection points</label><p className="text-xs text-emerald-200">Homepage takeover is disabled. Site Designer applies overrides onto the existing hosted theme.</p></div></Card></div><Card><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">Content overrides</h3><p className="mt-1 text-xs text-textMuted">Use text replacement, selectors, image selectors and attributes. This changes content without changing layout.</p></div><Button onClick={syncJson}>Sync JSON</Button></div><textarea className="min-h-[260px] w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white outline-none" value={contentText} onChange={(event) => setContentText(event.target.value)} /><p className="mt-2 text-xs text-textMuted">Example: replace exact text using the text object, or target elements using selectors/images/attributes.</p></Card><Card><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">Navigation overrides</h3><p className="mt-1 text-xs text-textMuted">Optional. Leave empty to let categories/products build the menu automatically.</p></div><Button onClick={syncJson}>Sync JSON</Button></div><textarea className="min-h-[180px] w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white outline-none" value={navigationText} onChange={(event) => setNavigationText(event.target.value)} /></Card></div>;
}
