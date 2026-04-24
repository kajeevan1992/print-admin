'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { ContentKind, ContentRecord } from '@/data/content';
import { contentService } from '@/services/content.service';

const labels: Record<ContentKind, { title: string; subtitle: string }> = {
  blog: {
    title: 'Blog Content',
    subtitle: 'Create and manage campaign articles, updates, and editorial content.'
  },
  page: {
    title: 'Page Content',
    subtitle: 'Manage standard storefront pages and informational content.'
  },
  category: {
    title: 'Category CMS',
    subtitle: 'Control category landing content, browse/upload/create flags, and page messaging.'
  },
  extended: {
    title: 'Extended Content',
    subtitle: 'Build custom audience pages, landing variants, and special merchandising content.'
  }
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
  seoDescription: ''
});

export function ContentRecordsPage({ kind }: { kind: ContentKind }) {
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ContentRecord, 'id' | 'updatedAt'>>(emptyFor(kind));

  const load = () => setItems(contentService.list(kind));

  useEffect(() => {
    load();
  }, [kind]);

  useEffect(() => {
    setForm(emptyFor(kind));
    setEditingId(null);
    setOpen(false);
  }, [kind]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || `${item.title} ${item.slug} ${item.summary}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyFor(kind));
    setOpen(true);
  };

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
      seoDescription: item.seoDescription
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    contentService.save({ ...form, id: editingId ?? undefined });
    load();
    setOpen(false);
  };

  const meta = labels[kind];

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={<PrimaryButton onClick={startCreate}>+ Add Entry</PrimaryButton>}
      />

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <Input placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'draft', 'published']} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} />
        <Card className="flex items-center justify-between px-4 py-2">
          <span className="text-sm text-textMuted">Entries</span>
          <span className="text-sm font-semibold">{filtered.length}</span>
        </Card>
      </div>

      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (row) => <div><div className="font-medium">{row.title}</div><div className="text-xs text-textMuted">/{row.slug}</div></div> },
          { key: 'summary', header: 'Summary', render: (row) => <span className="text-sm text-textMuted">{row.summary}</span> },
          { key: 'status', header: 'Status', render: (row) => row.status },
          { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <div className="flex gap-2">
                <Button onClick={() => startEdit(row)}>Edit</Button>
                <Button onClick={() => { contentService.remove(row.id); load(); }} className="text-red-300">Delete</Button>
              </div>
            )
          }
        ]}
        rows={filtered}
        rowKey={(row) => row.id}
      />

      <BaseModal open={open} onClose={() => setOpen(false)} title={editingId ? `Edit ${meta.title}` : `Add ${meta.title}`}>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
            <Input placeholder="Author" value={form.author} onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))} />
            <Select options={['draft', 'published']} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' }))} />
          </div>
          <Input placeholder="Summary" value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} />
          <textarea className="min-h-[140px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Body content" value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="SEO Title" value={form.seoTitle} onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))} />
            <Input placeholder="SEO Description" value={form.seoDescription} onChange={(e) => setForm((prev) => ({ ...prev, seoDescription: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
