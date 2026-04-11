'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { DataTable } from '@/components/data-table/data-table';
import { Toggle } from '@/components/forms/toggle';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { categoriesService } from '@/services/categories.service';
import { productCategories } from '@/data/products';
import { CategoryFormModal } from '@/modules/categories/components/category-form-modal';
import { CategoryTagsModal } from '@/modules/categories/components/category-tags-modal';
import type { Category, CategoryFormValues, CategoryTag } from '@/modules/categories/types';
import type { SelectOption } from '@/components/forms/select';

const emptyForm: CategoryFormValues = {
  name: '',
  description: '',
  parentId: '',
  pricingId: '',
  attributeSetId: '',
  published: true,
  thumbnail: '',
  friendlyUrl: '',
  accuZipConfig: '',
  useAlternateMaster: false,
  selectedTagId: '',
  tagIds: [],
  canBrowse: true,
  canUpload: false,
  canUploadLater: false,
  canCreate: true,
  canCustom: true
};

export function CategoriesListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<CategoryTag[]>([]);
  const [pricingOptions, setPricingOptions] = useState<SelectOption[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<SelectOption[]>([]);
  const [accuZipOptions, setAccuZipOptions] = useState<SelectOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormValues>(emptyForm);

  const categoryParentOptions = useMemo<SelectOption[]>(() => [
    { value: '', label: 'No Parent' },
    ...categories.map((item) => ({ value: item.id, label: item.name }))
  ], [categories]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoriesResponse, tagsResponse, pricingResponse, attributesResponse, accuZipResponse] = await Promise.all([
        categoriesService.listCategories(),
        categoriesService.listCategoryTags(),
        categoriesService.listPricingOptions(),
        categoriesService.listAttributeSets(),
        categoriesService.listAccuZipConfigs()
      ]);
      setCategories(categoriesResponse.data.items);
      setTags(tagsResponse.data.items);
      setPricingOptions(pricingResponse.data.items.map((item) => ({ value: item.id, label: item.name })));
      setAttributeOptions(attributesResponse.data.items.map((item) => ({ value: item.id, label: item.name })));
      setAccuZipOptions([{ value: '', label: 'No AccuZip Config' }, ...accuZipResponse.data.items.map((item) => ({ value: item.id, label: item.name }))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return categories.filter((item) => !term || item.name.toLowerCase().includes(term) || item.friendlyUrl.toLowerCase().includes(term));
  }, [categories, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      pricingId: pricingOptions[0] && typeof pricingOptions[0] !== 'string' ? pricingOptions[0].value : '',
      attributeSetId: attributeOptions[0] && typeof attributeOptions[0] !== 'string' ? attributeOptions[0].value : ''
    });
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description,
      parentId: category.parentId ?? '',
      pricingId: category.pricingId,
      attributeSetId: category.attributeSetId,
      published: category.published,
      thumbnail: category.thumbnail,
      friendlyUrl: category.friendlyUrl,
      accuZipConfig: category.accuZipConfig,
      useAlternateMaster: category.useAlternateMaster,
      selectedTagId: '',
      tagIds: category.tags.map((tag) => tag.id),
      canBrowse: category.canBrowse,
      canUpload: category.canUpload,
      canUploadLater: category.canUploadLater,
      canCreate: category.canCreate,
      canCustom: category.canCustom
    });
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize products into browsable storefront categories with pricing, access control, and CMS-ready structure."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button>Import</Button>
            <Button>Export</Button>
            <Button onClick={() => setTagsOpen(true)}>Add Tags</Button>
            <PrimaryButton onClick={openCreate}>+ Add Category</PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading categories...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && filtered.length === 0 ? <EmptyModuleState title="No categories found" description="Create your first category or adjust the search filter." action={<PrimaryButton onClick={openCreate}>Add Category</PrimaryButton>} /> : null}

      {!loading && !error && filtered.length > 0 ? (
        <DataTable
          columns={[
            { key: 'id', header: 'Id', render: (row) => row.id },
            { key: 'preview', header: 'Preview', render: (row) => <img src={row.thumbnail} alt={row.name} className="h-10 w-10 rounded-lg object-cover" /> },
            { key: 'sort', header: 'Sort', render: (row) => <div className="flex gap-1"><button onClick={() => categoriesService.moveCategory(row.id, 'up').then(load)} className="rounded border border-border px-2">↑</button><button onClick={() => categoriesService.moveCategory(row.id, 'down').then(load)} className="rounded border border-border px-2">↓</button></div> },
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'url', header: 'Friendly Url', render: (row) => row.friendlyUrl },
            { key: 'count', header: 'Product Count', render: (row) => row.productCount },
            { key: 'published', header: 'Published', render: (row) => <Toggle checked={row.published} onChange={(published) => categoriesService.togglePublished(row.id, published).then(load)} /> },
            { key: 'actions', header: 'Action', render: (row) => <div className="flex flex-wrap gap-2"><button onClick={() => openEdit(row)} className="text-accent">Edit</button><button className="text-textMuted">Edit CMS</button><button className="text-textMuted">Preview</button><button onClick={() => categoriesService.deleteCategory(row.id).then(load)} className="text-red-300">Delete</button></div> }
          ]}
          rows={filtered}
          rowKey={(row) => row.id}
        />
      ) : null}

      <CategoryFormModal
        open={modalOpen}
        title={editing ? 'Edit Category' : 'Add Category'}
        values={form}
        categoryOptions={categoryParentOptions}
        pricingOptions={pricingOptions}
        attributeOptions={attributeOptions}
        accuZipOptions={accuZipOptions}
        availableTags={tags}
        onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
        onAddTag={() => {
          if (!form.selectedTagId || form.tagIds.includes(form.selectedTagId)) return;
          setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, prev.selectedTagId], selectedTagId: '' }));
        }}
        onRemoveTag={(tagId) => setForm((prev) => ({ ...prev, tagIds: prev.tagIds.filter((item) => item !== tagId) }))}
        onClose={() => setModalOpen(false)}
        onSubmit={async () => {
          if (!form.name.trim()) return;
          if (editing) {
            await categoriesService.updateCategory(editing.id, form);
          } else {
            await categoriesService.createCategory(form);
          }
          setModalOpen(false);
          await load();
        }}
      />

      <CategoryTagsModal
        open={tagsOpen}
        tags={tags}
        onClose={() => setTagsOpen(false)}
        onSave={async (labels) => {
          await categoriesService.saveCategoryTags(labels);
          setTagsOpen(false);
          await load();
        }}
      />
    </div>
  );
}
