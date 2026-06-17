'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { BaseModal } from '@/components/modals/base-modal';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { ContentKind, ContentRecord } from '@/data/content';
import { contentService } from '@/services/content.service';

const labels: Record<ContentKind, { title: string; subtitle: string }> = {
  blog: { title: 'Blog Content', subtitle: 'Create and manage campaign articles, updates, and editorial content.' },
  page: { title: 'Page Content', subtitle: 'Manage standard storefront pages and informational content.' },
  category: { title: 'Category CMS & SEO', subtitle: 'Reuse the existing category CMS record for SEO title, meta description, hero copy and menu hints.' },
  extended: { title: 'Extended Content', subtitle: 'Build custom audience pages, landing variants, and special merchandising content.' },
};

const emptyFor = (kind: ContentKind): Omit<ContentRecord, 'id' | 'updatedAt'> => ({
  kind,
  title: '',
  slug: '',
  status: 'draft',
  author: 'Admin',
  summary: '',
  body: '',
  seoTitle: '',
  seoDescription: '',
  heroTitle: '',
  heroIntro: '',
  heroImage: '',
  menuLabel: '',
  menuDescription: '',
  menuOrder: 100,
  showInMenu: false,
  canonicalPath: '',
});

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/^\/+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function categoryPath(slug: string) {
  const clean = slugify(slug);
  return clean ? `/${clean}` : '';
}

export function ContentRecordsPage({ kind }: { kind: ContentKind }) {
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ContentRecord, 'id' | 'updatedAt'>>(emptyFor(kind));
  const [syncState, setSyncState] = useState<'loading' | 'db' | 'local' | 'error'>('loading');
  const [syncMessage, setSyncMessage] = useState('Loading content from internal API...');

  const load = async () => {
    setSyncState('loading');
    setSyncMessage('Loading content from internal API...');
    try {
      const result = await contentService.list(kind);
      setItems(result.items);
      setSyncState(result.source === 'db' ? 'db' : 'local');
      setSyncMessage(result.message);
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to load content records.');
    }
  };

  useEffect(() => { void load(); }, [kind]);
  useEffect(() => { setForm(emptyFor(kind)); setEditingId(null); setOpen(false); }, [kind]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesSearch = !search || `${item.title} ${item.slug} ${item.summary} ${item.seoTitle} ${item.seoDescription}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || item.status === status;
    return matchesSearch && matchesStatus;
  }), [items, search, status]);

  const startCreate = () => { setEditingId(null); setForm(emptyFor(kind)); setOpen(true); };

  const startEdit = (item: ContentRecord) => {
    setEditingId(item.id);
    setForm({
      kind: item.kind,
      title: item.title,
      slug: item.slug,
      status: item.status,
      author: item.author,
      summary: item.summary,
      body: item.body,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      heroTitle: item.heroTitle || '',
      heroIntro: item.heroIntro || '',
      heroImage: item.heroImage || '',
      menuLabel: item.menuLabel || '',
      menuDescription: item.menuDescription || '',
      menuOrder: Number(item.menuOrder || 100),
      showInMenu: Boolean(item.showInMenu),
      canonicalPath: item.canonicalPath || categoryPath(item.slug),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSyncState('loading');
    setSyncMessage('Saving content through internal API...');
    try {
      const cleanSlug = slugify(form.slug);
      await contentService.save({
        ...form,
        id: editingId ?? undefined,
        slug: cleanSlug,
        canonicalPath: form.canonicalPath || (kind === 'category' ? categoryPath(cleanSlug) : ''),
      });
      await load();
      setSyncState('db');
      setSyncMessage('Saved to database through internal API.');
      setOpen(false);
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to save content record.');
    }
  };

  const remove = async (id: string) => {
    setSyncState('loading');
    setSyncMessage('Deleting content through internal API...');
    try {
      await contentService.remove(id);
      await load();
      setSyncState('db');
      setSyncMessage('Deleted from database through internal API.');
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to delete content record.');
    }
  };

  const meta = labels[kind];
  const isCategory = kind === 'category';

  return (
    <div>
      <PageHeader title={meta.title} subtitle={meta.subtitle} actions={<PrimaryButton onClick={startCreate}>+ Add Entry</PrimaryButton>} />
      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${syncState === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : syncState === 'db' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-border bg-panel text-textMuted'}`}>{syncMessage}</div>

      {isCategory ? <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">Category SEO now reuses this existing Category CMS record. Match the slug to the category slug, for example <span className="font-semibold text-white">business-cards</span>. The frontend reads these records and overrides the category landing page title, intro, image and meta copy.</div> : null}

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <Input placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'draft', 'published']} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} />
        <Card className="flex items-center justify-between px-4 py-2"><span className="text-sm text-textMuted">Entries</span><span className="text-sm font-semibold">{filtered.length}</span></Card>
      </div>

      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (row) => <div><div className="font-medium">{row.title}</div><div className="text-xs text-textMuted">/{row.slug}</div></div> },
          { key: 'summary', header: isCategory ? 'SEO / Summary' : 'Summary', render: (row) => <span className="text-sm text-textMuted">{isCategory ? (row.seoTitle || row.summary) : row.summary}</span> },
          { key: 'status', header: 'Status', render: (row) => row.status },
          { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
          { key: 'action', header: 'Action', render: (row) => <div className="flex gap-2"><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={() => void remove(row.id)} className="text-red-300">Delete</Button></div> },
        ]}
        rows={filtered}
        rowKey={(row) => row.id}
      />

      <BaseModal open={open} onClose={() => setOpen(false)} title={editingId ? `Edit ${meta.title}` : `Add ${meta.title}`}>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value, menuLabel: isCategory && !prev.menuLabel ? e.target.value : prev.menuLabel }))} />
            <Input placeholder={isCategory ? 'Category slug, e.g. business-cards' : 'Slug'} value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value), canonicalPath: isCategory ? categoryPath(e.target.value) : prev.canonicalPath }))} />
            <Input placeholder="Author" value={form.author} onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))} />
            <Select options={['draft', 'published']} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' }))} />
          </div>
          <Input placeholder="Summary" value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} />
          <textarea className="min-h-[140px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent" placeholder={isCategory ? 'Category body / supporting copy' : 'Body content'} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="SEO Title" value={form.seoTitle} onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))} />
            <Input placeholder="SEO Description" value={form.seoDescription} onChange={(e) => setForm((prev) => ({ ...prev, seoDescription: e.target.value }))} />
          </div>

          {isCategory ? <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-textMuted">Category landing fields</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Hero Title" value={form.heroTitle || ''} onChange={(e) => setForm((prev) => ({ ...prev, heroTitle: e.target.value }))} />
              <Input placeholder="Hero Image URL" value={form.heroImage || ''} onChange={(e) => setForm((prev) => ({ ...prev, heroImage: e.target.value }))} />
            </div>
            <textarea className="mt-3 min-h-[90px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Hero Intro" value={form.heroIntro || ''} onChange={(e) => setForm((prev) => ({ ...prev, heroIntro: e.target.value }))} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input placeholder="Menu Label" value={form.menuLabel || ''} onChange={(e) => setForm((prev) => ({ ...prev, menuLabel: e.target.value }))} />
              <Input type="number" placeholder="Menu Order" value={String(form.menuOrder ?? 100)} onChange={(e) => setForm((prev) => ({ ...prev, menuOrder: Number(e.target.value) || 100 }))} />
              <Input placeholder="Canonical Path" value={form.canonicalPath || categoryPath(form.slug)} onChange={(e) => setForm((prev) => ({ ...prev, canonicalPath: e.target.value }))} />
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">Show hint in menu <Toggle checked={Boolean(form.showInMenu)} onChange={(showInMenu) => setForm((prev) => ({ ...prev, showInMenu }))} /></div>
            </div>
            <textarea className="mt-3 min-h-[70px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Menu Description" value={form.menuDescription || ''} onChange={(e) => setForm((prev) => ({ ...prev, menuDescription: e.target.value }))} />
          </div> : null}

          <div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>Cancel</Button><PrimaryButton onClick={() => void save()}>Save</PrimaryButton></div>
        </div>
      </BaseModal>
    </div>
  );
}
