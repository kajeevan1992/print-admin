'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Card } from '@/components/ui/card';
import { BaseModal } from '@/components/modals/base-modal';
import { collectionsService } from '@/services/collections.service';
import { productsService } from '@/services/products.service';
import { categoriesService } from '@/services/categories.service';
import type { CollectionFormValues, Collection } from '@/modules/collections/types';
import type { Product } from '@/modules/products/types';
import type { Category } from '@/modules/categories/types';

const emptyForm: CollectionFormValues = { title: '', productIds: [], categoryIds: [] };

export function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState<CollectionFormValues>(emptyForm);
  const [status, setStatus] = useState('Connecting collections to internal API...');

  const load = async () => {
    const [collectionsResponse, productsResponse, categoriesResponse] = await Promise.all([
      collectionsService.listCollections(search),
      productsService.listProducts({ perPage: 200 }),
      categoriesService.listCategories()
    ]);
    const liveProducts = productsResponse.data.items.map((product) => ({ id: product.id, name: product.name, thumbnail: product.thumbnail, productNumbers: product.productNumbers }));
    const liveCategories = categoriesResponse.data.items.map((category) => ({ id: category.id, name: category.name, thumbnail: category.thumbnail }));
    setItems(collectionsResponse.data.items.map((item) => ({
      ...item,
      products: liveProducts.filter((product) => item.productIds.includes(product.id)),
      categories: liveCategories.filter((category) => item.categoryIds.includes(category.id))
    })));
    setProducts(productsResponse.data.items);
    setCategories(categoriesResponse.data.items);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('print-admin.live-products-cache', JSON.stringify(liveProducts));
      window.sessionStorage.setItem('print-admin.live-categories-cache', JSON.stringify(liveCategories));
    }
    setStatus(collectionsResponse.data.items.length ? 'Connected to internal API. Collections loaded from tenant database.' : 'Connected to internal API. No collections have been created yet.');
  };

  useEffect(() => {
    void load();
  }, [search]);

  const productChoices = useMemo(
    () => products.map((product) => ({ id: product.id, label: `${product.name} · ${product.productNumbers?.itemNumber || 'No item number'}` })),
    [products]
  );
  const categoryChoices = useMemo(() => categories.map((category) => ({ id: category.id, label: category.name })), [categories]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (item: Collection) => {
    setEditing(item);
    setForm({ title: item.title, productIds: item.productIds, categoryIds: item.categoryIds });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Collections" subtitle="Curate groups of products and categories into storefront collections." actions={<PrimaryButton onClick={startCreate}>+ Add Collection</PrimaryButton>} />

      <div className="mb-4 space-y-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">DB/API status: {status}</div>
        <div className="flex gap-2">
          <Input placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-textMuted">{item.id} · Created on {item.createdOn}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => startEdit(item)}>View / Edit</Button>
                <Button className="text-red-300" onClick={() => collectionsService.deleteCollection(item.id).then(() => { setStatus('Collection deleted from internal API.'); return load(); })}>Delete</Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Products</p>
                <div className="space-y-2">
                  {item.products.length === 0 ? <p className="text-sm text-textMuted">No products in this collection.</p> : item.products.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <img src={product.thumbnail || 'https://placehold.co/56x56'} alt={product.name} className="h-12 w-12 rounded object-cover" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-textMuted">{product.productNumbers?.itemNumber || '—'} · {product.productNumbers?.modelNumber || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Categories</p>
                <div className="space-y-2">
                  {item.categories.length === 0 ? <p className="text-sm text-textMuted">No categories in this collection.</p> : item.categories.map((category) => (
                    <div key={category.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <img src={category.thumbnail || 'https://placehold.co/56x56'} alt={category.name} className="h-12 w-12 rounded object-cover" />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-textMuted">{category.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <BaseModal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Collection' : 'Add Collection'}>
        <div className="space-y-4">
          <Input placeholder="Collection name" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-medium">Products</p>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {productChoices.map((product) => (
                  <label key={product.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        productIds: e.target.checked ? [...prev.productIds, product.id] : prev.productIds.filter((id) => id !== product.id)
                      }))}
                    />
                    <span>{product.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium">Categories</p>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {categoryChoices.map((category) => (
                  <label key={category.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(category.id)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        categoryIds: e.target.checked ? [...prev.categoryIds, category.id] : prev.categoryIds.filter((id) => id !== category.id)
                      }))}
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <PrimaryButton onClick={async () => {
              if (!form.title.trim()) return;
              if (editing) {
                await collectionsService.updateCollection(editing.id, form);
                setStatus('Collection saved to internal API.');
              } else {
                await collectionsService.createCollection(form);
                setStatus('Collection created in internal API.');
              }
              setOpen(false);
              await load();
            }}>{editing ? 'Save Changes' : 'Create Collection'}</PrimaryButton>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
