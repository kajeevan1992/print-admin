'use client';

import { useEffect, useState } from 'react';
import { Copy, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Template = { key: string; label: string; pageType: string; title: string; metaDescription: string; h1: string; path: string; targetKeyword: string; notes: string; schemaTypes: string[] };
type Preview = { title: string; metaDescription: string; h1: string; path: string; targetKeyword: string; introCopy: string; schemaTypes: string[]; internalLinks?: Array<{ label: string; href: string }>; faqItems?: Array<{ question: string; answer: string }> };

export function SeoTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [productLimit, setProductLimit] = useState('8');
  const [locationLimit, setLocationLimit] = useState('6');
  const [publish, setPublish] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function api(body?: Record<string, any>, query = '') {
    const response = body
      ? await fetch('/api/internal/seo/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/internal/seo/templates${query}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO template action failed.');
    return payload.data;
  }

  async function load() {
    const data = await api();
    setTemplates(data.templates || []);
    const previewData = await api(undefined, '?action=preview&key=product-location');
    setPreview(previewData.preview || null);
  }

  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);

  async function seedTemplates() {
    setBusy(true); setMessage('');
    try {
      const data = await api({ action: 'seed' });
      setMessage(`Seeded ${data.count || 0} SEO templates.`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Template seed failed.'); }
    finally { setBusy(false); }
  }

  async function generatePages() {
    setBusy(true); setMessage('Generating SEO pages...');
    try {
      const data = await api({ action: 'generate', productLimit: Number(productLimit || 8), locationLimit: Number(locationLimit || 6), publish });
      setMessage(`Generated ${data.count || 0} SEO pages from ${data.products || 0} products and ${data.locations || 0} locations. Status: ${publish ? 'published' : 'draft'}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'SEO page generation failed.'); }
    finally { setBusy(false); }
  }

  async function copyPreview() {
    if (!preview) return;
    await navigator.clipboard?.writeText(JSON.stringify(preview, null, 2)).catch(() => null);
    setMessage('Preview copied.');
  }

  return (
    <div>
      <PageHeader
        title="SEO Templates"
        subtitle="Generate powerful product, location, collection-point, service-area and guide SEO records using the existing SEO Engine foundation."
        actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seedTemplates()} disabled={busy}>Seed templates</Button><PrimaryButton onClick={() => void generatePages()} disabled={busy}><Wand2 size={14} /> Generate pages</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-white">Generation controls</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-xs text-textMuted">Product limit<Input value={productLimit} onChange={(e) => setProductLimit(e.target.value)} /></label>
            <label className="grid gap-2 text-xs text-textMuted">Location limit<Input value={locationLimit} onChange={(e) => setLocationLimit(e.target.value)} /></label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish generated pages immediately</label>
          <p className="mt-4 text-sm leading-6 text-textMuted">Recommended launch workflow: generate as draft first, review SEO Engine audit scores, then publish the best pages only. Partner collection-point pages are marked honestly and protected from fake LocalBusiness schema.</p>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">Product-location preview</h3><Button onClick={() => void copyPreview()}><Copy size={14} /> Copy</Button></div>
          {preview ? <div className="space-y-3 text-sm">
            <Read label="Path" value={preview.path} />
            <Read label="Title" value={preview.title} />
            <Read label="Meta" value={preview.metaDescription} />
            <Read label="H1" value={preview.h1} />
            <Read label="Keyword" value={preview.targetKeyword} />
            <Read label="Schema" value={(preview.schemaTypes || []).join(', ')} />
          </div> : <p className="text-sm text-textMuted">No preview loaded yet.</p>}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => <Card key={template.key}>
          <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">{template.label}</h3><p className="mt-1 text-xs text-textMuted">{template.key} · {template.pageType}</p></div><span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200">{template.schemaTypes?.length || 0} schema</span></div>
          <div className="space-y-2 text-xs text-textMuted">
            <p><span className="text-white">Title:</span> {template.title}</p>
            <p><span className="text-white">Path:</span> {template.path}</p>
            <p><span className="text-white">Keyword:</span> {template.targetKeyword}</p>
            <p>{template.notes}</p>
          </div>
        </Card>)}
      </div>
    </div>
  );
}

function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
