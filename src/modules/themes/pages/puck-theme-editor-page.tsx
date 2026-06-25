'use client';

import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@measured/puck';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Section = Record<string, any>;
const components = {
  Hero: { fields: { title: { type: 'text' }, subtitle: { type: 'textarea' }, buttonLabel: { type: 'text' }, buttonHref: { type: 'text' } }, render: (props: any) => <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-3xl font-black text-slate-950">{props.title || 'Hero title'}</h2><p className="mt-2 text-slate-600">{props.subtitle || 'Hero subtitle'}</p>{props.buttonLabel ? <span className="mt-4 inline-flex rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white">{props.buttonLabel}</span> : null}</section> },
  ProductGrid: { fields: { title: { type: 'text' }, productSlugs: { type: 'textarea' } }, render: (props: any) => <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-2xl font-black text-slate-950">{props.title || 'Product grid'}</h2><p className="mt-2 text-sm text-slate-600">{props.productSlugs}</p></section> },
  TextImage: { fields: { title: { type: 'text' }, subtitle: { type: 'textarea' }, imageUrl: { type: 'text' } }, render: (props: any) => <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-2xl font-black text-slate-950">{props.title || 'Text / image'}</h2><p className="mt-2 text-slate-600">{props.subtitle}</p></section> },
  ContactCTA: { fields: { title: { type: 'text' }, subtitle: { type: 'textarea' } }, render: (props: any) => <section className="rounded-2xl bg-sky-500 p-6 text-white"><h2 className="text-2xl font-black">{props.title || 'Contact CTA'}</h2><p className="mt-2 opacity-90">{props.subtitle}</p></section> },
};
const config = { components } as any;
function sectionsToPuck(sections: Section[]) { return { content: (sections || []).map((section) => ({ type: section.type === 'hero' ? 'Hero' : section.type === 'product-grid' ? 'ProductGrid' : section.type === 'contact-cta' ? 'ContactCTA' : 'TextImage', props: { id: section.id, ...section, productSlugs: Array.isArray(section.productSlugs) ? section.productSlugs.join(', ') : section.productSlugs } })), root: {} }; }
function puckToSections(data: any) { return (data?.content || []).map((item: any, index: number) => { const props = item.props || {}; const type = item.type === 'Hero' ? 'hero' : item.type === 'ProductGrid' ? 'product-grid' : item.type === 'ContactCTA' ? 'contact-cta' : 'text-image'; return { ...props, id: props.id || `${type}-${index + 1}`, type, enabled: props.enabled !== false, productSlugs: typeof props.productSlugs === 'string' ? props.productSlugs.split(',').map((x: string) => x.trim()).filter(Boolean) : props.productSlugs }; }); }
export function PuckThemeEditorPage() {
  const [channelSlug, setChannelSlug] = useState('default-store');
  const [settings, setSettings] = useState<any>(null);
  const [data, setData] = useState<any>({ content: [], root: {} });
  const [message, setMessage] = useState('Loading Puck editor...');
  const [busy, setBusy] = useState(false);
  async function load(slug = channelSlug) { setBusy(true); try { const res = await fetch(`/api/internal/hosted-theme-editor?channelSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load theme.'); setSettings(payload.data.settings); setData(sectionsToPuck(payload.data.settings.sections || [])); setMessage('Puck editor loaded with styling fix.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load theme.'); } finally { setBusy(false); } }
  async function save(nextData = data) { if (!settings) return; setBusy(true); try { const res = await fetch('/api/internal/hosted-theme-editor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, sections: puckToSections(nextData) }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save Puck sections.'); setSettings(payload.data.settings); setData(sectionsToPuck(payload.data.settings.sections || [])); setMessage('Puck sections saved as draft.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save Puck sections.'); } finally { setBusy(false); } }
  useEffect(() => { void load('default-store'); }, []);
  const ready = useMemo(() => Boolean(settings), [settings]);
  return <div className="space-y-4"><PageHeader title="Block Editor" subtitle="Puck editor integration for approved hosted theme blocks. Saves back to the safe hosted theme JSON." actions={<><Button onClick={() => void load()} disabled={busy}>Refresh</Button><PrimaryButton onClick={() => void save()} disabled={busy || !ready}>Save draft</PrimaryButton></>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<Card><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={channelSlug} onChange={(e) => setChannelSlug(e.target.value)} placeholder="Channel slug" /><Button onClick={() => void load(channelSlug)} disabled={busy}>Load channel</Button></div><p className="mt-2 text-xs text-textMuted">Open the editor below. Use the Publish button inside the editor or Save draft above.</p></Card><div className="puck-admin-shell border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"><Puck config={config} data={data} onChange={(nextData: any) => setData(nextData)} onPublish={(nextData: any) => { setData(nextData); void save(nextData); }} /></div></div>;
}
