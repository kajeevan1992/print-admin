'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { PageHeader } from '@/components/ui/page-header';
import type { HtmlSnippet } from '@/data/content';
import { htmlSnippetsService } from '@/services/content.service';

const emptySnippet: Omit<HtmlSnippet, 'id' | 'updatedAt'> = { name: '', location: 'head', status: 'draft', code: '', notes: '' };

export function HtmlSnippetsPage() {
  const [items, setItems] = useState<HtmlSnippet[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<HtmlSnippet, 'id' | 'updatedAt'>>(emptySnippet);
  const [syncState, setSyncState] = useState<'loading' | 'db' | 'local' | 'error'>('loading');
  const [syncMessage, setSyncMessage] = useState('Loading snippets from internal API...');

  const load = async () => {
    setSyncState('loading');
    setSyncMessage('Loading snippets from internal API...');
    try {
      const result = await htmlSnippetsService.list();
      setItems(result.items);
      setSyncState(result.source === 'db' ? 'db' : 'local');
      setSyncMessage(result.message);
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to load snippets.');
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((item) => !search || `${item.name} ${item.location} ${item.notes}`.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const startCreate = () => { setEditingId(null); setForm(emptySnippet); setOpen(true); };
  const startEdit = (item: HtmlSnippet) => { setEditingId(item.id); setForm({ name: item.name, location: item.location, status: item.status, code: item.code, notes: item.notes }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSyncState('loading');
    setSyncMessage('Saving snippet through internal API...');
    try {
      await htmlSnippetsService.save({ ...form, id: editingId ?? undefined });
      await load();
      setSyncState('db');
      setSyncMessage('Saved to database through internal API.');
      setOpen(false);
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to save snippet.');
    }
  };

  const remove = async (id: string) => {
    setSyncState('loading');
    setSyncMessage('Deleting snippet through internal API...');
    try {
      await htmlSnippetsService.remove(id);
      await load();
      setSyncState('db');
      setSyncMessage('Deleted from database through internal API.');
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to delete snippet.');
    }
  };

  return (
    <div>
      <PageHeader title="HTML Snippets" subtitle="Manage reusable raw HTML, script, and embed snippets for head, footer, product, and checkout areas." actions={<PrimaryButton onClick={startCreate}>+ Add Snippet</PrimaryButton>} />

      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${syncState === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : syncState === 'db' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-border bg-panel text-textMuted'}`}>{syncMessage}</div>

      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <Input placeholder="Search snippets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="rounded-xl border border-border bg-panel px-4 py-2 text-sm text-textMuted">{filtered.length} snippets</div>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.notes}</div></div> },
          { key: 'location', header: 'Location', render: (row) => row.location },
          { key: 'status', header: 'Status', render: (row) => row.status },
          { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
          { key: 'action', header: 'Action', render: (row) => <div className="flex gap-2"><Button onClick={() => startEdit(row)}>Edit</Button><Button onClick={() => void remove(row.id)} className="text-red-300">Delete</Button></div> },
        ]}
        rows={filtered}
        rowKey={(row) => row.id}
      />

      <BaseModal open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit HTML Snippet' : 'Add HTML Snippet'}>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Select options={['head', 'footer', 'product-page', 'checkout']} value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value as HtmlSnippet['location'] }))} />
            <Select options={['draft', 'published']} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as HtmlSnippet['status'] }))} />
          </div>
          <textarea className="min-h-[180px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 font-mono text-sm outline-none focus:border-accent" placeholder="Paste raw HTML / script / embed code" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          <div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>Cancel</Button><PrimaryButton onClick={() => void save()}>Save</PrimaryButton></div>
        </div>
      </BaseModal>
    </div>
  );
}
