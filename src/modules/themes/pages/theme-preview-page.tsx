'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type Preview = Record<string, any>;
function sectionTitle(section: any) { return section?.title || section?.type || 'Section'; }
export function ThemePreviewPage() {
  const [previewId, setPreviewId] = useState('');
  const [data, setData] = useState<Preview | null>(null);
  const [message, setMessage] = useState('Loading preview...');
  async function load(id = previewId) { if (!id) { setMessage('Missing previewId.'); return; } const res = await fetch(`/api/internal/platform/theme-preview?previewId=${encodeURIComponent(id)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) { setMessage(payload?.error || 'Preview could not load.'); setData(null); return; } setData(payload.data); setMessage('Preview loaded.'); }
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('previewId') || ''; setPreviewId(id); void load(id); }, []);
  const brand = data?.brand || {};
  return <div className="space-y-4"><PageHeader title="Theme Preview Sandbox" subtitle="Temporary preview of a theme design without publishing it." actions={<Button onClick={() => void load()}>Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="rounded-3xl border bg-white p-6" style={{ borderColor: '#e5e7eb', color: brand.text || '#111827' }}><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: brand.primary || '#18a7d0' }}>{data?.themeKey || 'Theme'} · {data?.version || 'preview'}</p><h1 className="mt-2 text-4xl font-black">{brand.brandName || 'Preview Store'}</h1><p className="mt-2 text-sm opacity-70">Channel: {data?.channelSlug || 'default-store'}</p><div className="mt-6 grid gap-4">{(data?.sections || []).map((section: any, i: number) => <div key={section.id || i} className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb' }}><strong>{sectionTitle(section)}</strong><p className="mt-1 text-sm opacity-70">{section.subtitle || section.type}</p></div>)}</div></div></Card></div>;
}
