'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { DataTable } from '@/components/data-table/data-table';
import { Toggle } from '@/components/forms/toggle';
import { BaseModal } from '@/components/modals/base-modal';
import { tagsService } from '@/services/tags.service';
import type { Tag, TagFormValues } from '@/modules/tags/types';

const emptyForm: TagFormValues = { name: '', parentId: '', published: false, sidebar: false, friendlyUrl: '' };

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagFormValues>(emptyForm);

  const load = async () => {
    const response = await tagsService.listTags(search);
    setTags(response.data.items);
  };

  useEffect(() => {
    void load();
  }, [search]);

  const parentOptions = useMemo<SelectOption[]>(() => [{ value: '', label: 'None' }, ...tags.filter((tag) => !tag.parentId).map((tag) => ({ value: tag.id, label: tag.name }))], [tags]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setForm({ name: tag.name, parentId: tag.parentId || '', published: tag.published, sidebar: tag.sidebar, friendlyUrl: tag.friendlyUrl });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Tags" subtitle="Create and manage product tags with browse-by hierarchy and storefront sidebar visibility." actions={<PrimaryButton onClick={openCreate}>+ Add Tag</PrimaryButton>} />

      <div className="mb-4 flex gap-2">
        <Input placeholder="Search tags..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable
        columns={[
          { key: 'id', header: 'Id', render: (row) => row.id },
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'browseBy', header: 'Browse By', render: (row) => row.browseBy || '—' },
          { key: 'url', header: 'Friendly Url', render: (row) => row.friendlyUrl },
          { key: 'published', header: 'Published', render: (row) => <Toggle checked={row.published} onChange={(published) => tagsService.updateTag(row.id, { published }).then(load)} /> },
          { key: 'sidebar', header: 'Sidebar', render: (row) => <Toggle checked={row.sidebar} onChange={(sidebar) => tagsService.updateTag(row.id, { sidebar }).then(load)} /> },
          {
            key: 'actions',
            header: 'Action',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(row)}>Edit</Button>
                <Button onClick={() => window.open(`/${row.friendlyUrl.replace(/^\//, '')}`, '_blank', 'noopener,noreferrer')} disabled={!row.published}>Preview</Button>
                <Button className="text-red-300" onClick={() => tagsService.deleteTag(row.id).then(load)}>Delete</Button>
              </div>
            )
          }
        ]}
        rows={tags}
        rowKey={(row) => row.id}
      />

      <BaseModal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Tag' : 'Add Tag'}>
        <div className="space-y-4">
          {editing ? <Input value={editing.cmsPageLink} readOnly /> : null}
          <Input placeholder="Tag name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Select options={parentOptions} value={form.parentId} onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))} />
          <Input placeholder="Friendly URL" value={form.friendlyUrl} onChange={(e) => setForm((prev) => ({ ...prev, friendlyUrl: e.target.value }))} />
          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            Published
            <input type="checkbox" checked={form.published} onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            Sidebar
            <input type="checkbox" checked={form.sidebar} onChange={(e) => setForm((prev) => ({ ...prev, sidebar: e.target.checked }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <PrimaryButton onClick={async () => {
              if (!form.name.trim()) return;
              if (editing) await tagsService.updateTag(editing.id, form);
              else await tagsService.createTag(form);
              setOpen(false);
              await load();
            }}>{editing ? 'Save Changes' : 'Create Tag'}</PrimaryButton>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
