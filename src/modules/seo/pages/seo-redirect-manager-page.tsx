'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Link2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type SeoRedirect = {
  id: string;
  slug: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  note?: string;
  hitCount: number;
  lastHitAt?: string;
  updatedAt?: string;
};

type Summary = { total: number; active: number; inactive: number; gone: number; hits: number };

const emptyForm = {
  id: '',
  fromPath: '',
  toPath: '',
  statusCode: '301',
  isActive: 'true',
  note: '',
};

function normalisePath(value: string) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function statusLabel(code: number) {
  if (code === 301) return '301 permanent';
  if (code === 302) return '302 temporary';
  if (code === 307) return '307 temporary';
  if (code === 308) return '308 permanent';
  if (code === 410) return '410 gone';
  return String(code);
}

export function SeoRedirectManagerPage() {
  const [items, setItems] = useState<SeoRedirect[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, inactive: 0, gone: 0, hits: 0 });
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, active });
    const response = await fetch(`/api/internal/seo/redirects?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Redirects failed to load.');
    setItems(payload.data?.items || []);
    setSummary(payload.data?.summary || summary);
    setLoading(false);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  const selectedPreview = useMemo(() => {
    if (!form.fromPath) return 'Add an old URL to preview the redirect.';
    if (form.statusCode === '410') return `${normalisePath(form.fromPath)} → 410 Gone`;
    return `${normalisePath(form.fromPath)} → ${normalisePath(form.toPath) || '/new-url'}`;
  }, [form]);

  function edit(item: SeoRedirect) {
    setForm({
      id: item.id,
      fromPath: item.fromPath,
      toPath: item.toPath || '',
      statusCode: String(item.statusCode || 301),
      isActive: item.isActive ? 'true' : 'false',
      note: item.note || '',
    });
    setMessage(`Editing redirect ${item.fromPath}.`);
  }

  async function save() {
    setMessage('Saving redirect...');
    const body = {
      id: form.id || undefined,
      fromPath: normalisePath(form.fromPath),
      toPath: form.statusCode === '410' ? '' : normalisePath(form.toPath),
      statusCode: Number(form.statusCode || 301),
      isActive: form.isActive === 'true',
      note: form.note,
    };
    const response = await fetch('/api/internal/seo/redirects', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Redirect save failed.');
    setMessage(`Saved ${body.fromPath}.`);
    setForm(emptyForm);
    await load();
  }

  async function remove(item: SeoRedirect) {
    if (!window.confirm(`Delete redirect ${item.fromPath}?`)) return;
    const response = await fetch(`/api/internal/seo/redirects?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Redirect delete failed.');
    setMessage(`Deleted ${item.fromPath}.`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="SEO Redirect Manager"
        subtitle="Protect rankings when product, category, local SEO or collection-point URLs change. Reuses the existing CoreCatalogRecord storage instead of creating a duplicate SEO database."
        actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton onClick={() => void save()}>Save redirect</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <Metric label="Total" value={summary.total} />
        <Metric label="Active" value={summary.active} tone="green" />
        <Metric label="Inactive" value={summary.inactive} tone="amber" />
        <Metric label="410 Gone" value={summary.gone} tone="red" />
        <Metric label="Tracked hits" value={summary.hits} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2"><Link2 size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Create or edit redirect</h3></div>
          <div className="grid gap-3">
            <Input placeholder="Old URL e.g. /old-business-card-page" value={form.fromPath} onChange={(e) => setForm((prev) => ({ ...prev, fromPath: e.target.value }))} />
            <Input placeholder="New URL e.g. /standard-business-cards" value={form.toPath} onChange={(e) => setForm((prev) => ({ ...prev, toPath: e.target.value }))} disabled={form.statusCode === '410'} />
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={form.statusCode} onChange={(e) => setForm((prev) => ({ ...prev, statusCode: e.target.value }))} options={[
                { value: '301', label: '301 permanent' },
                { value: '302', label: '302 temporary' },
                { value: '307', label: '307 temporary' },
                { value: '308', label: '308 permanent' },
                { value: '410', label: '410 gone / removed' },
              ]} />
              <Select value={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value }))} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
            </div>
            <Input placeholder="Internal note e.g. product slug changed" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">{selectedPreview}</div>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void save()}>Save redirect</PrimaryButton>
              <Button onClick={() => setForm(emptyForm)}>Clear</Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <Input placeholder="Search old or new URL..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={active} onChange={(e) => setActive(e.target.value)} options={[{ value: 'all', label: 'All redirects' }, { value: 'true', label: 'Active only' }, { value: 'false', label: 'Inactive only' }]} />
              <Button onClick={() => void load()}>Apply</Button>
            </div>
          </div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading redirects...</div> : null}
          <div className="divide-y divide-white/6">
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 hover:bg-white/[0.03]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button onClick={() => edit(item)} className="text-left">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      <span>{item.fromPath}</span><ArrowRight size={14} className="text-textMuted" /><span>{item.statusCode === 410 ? 'Gone' : item.toPath}</span>
                    </div>
                    <p className="mt-1 text-xs text-textMuted">{statusLabel(item.statusCode)} · {item.isActive ? 'active' : 'inactive'} · {item.hitCount || 0} hits</p>
                    {item.note ? <p className="mt-1 text-xs text-textMuted">{item.note}</p> : null}
                  </button>
                  <div className="flex gap-2">
                    <Button onClick={() => edit(item)}>Edit</Button>
                    <Button onClick={() => void remove(item)}><Trash2 size={14} /> Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No redirects yet. Add one when a URL changes.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    default: 'border-white/8 bg-white/[0.03] text-white',
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    red: 'border-red-500/20 bg-red-500/10 text-red-100',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
  };
  return <div className={`rounded-xl border p-4 ${tones[tone]}`}><p className="text-xs uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
