'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { FilterBar } from '@/components/data-table/filter-bar';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { ProductForm } from '@/modules/products/components/product-form';
import { ProductTable, type ProductRowAction } from '@/modules/products/components/product-table';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { categoriesService } from '@/services/categories.service';
import { vendorsService } from '@/services/vendors.service';
import { productsService } from '@/services/products.service';
import type { Product, ProductCreateInput, ProductListQuery } from '@/modules/products/types';

const initialCreateInput: ProductCreateInput = {
  name: '',
  categoryId: '',
  creationMethod: 'idml_template',
  productType: 'online'
};

export function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState<ProductListQuery>({ page: 1, perPage: 20, sortBy: 'lastSavedAt', sortDirection: 'desc', published: 'all', global: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<SelectOption[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [createInput, setCreateInput] = useState<ProductCreateInput>(initialCreateInput);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const loadProducts = async (nextQuery: ProductListQuery) => {
    setLoading(true);
    setError(null);

    try {
      const res = await productsService.listProducts(nextQuery);
      const uncategorizedRes = await productsService.listProducts({ ...nextQuery, uncategorized: true, page: 1, perPage: 1 });
      setProducts(res.data.items);
      setTotal(res.meta.total);
      setUncategorizedCount(uncategorizedRes.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(query);
  }, [query]);

  useEffect(() => {
    Promise.all([categoriesService.listCategories(), vendorsService.listVendors()]).then(([catRes, vendorRes]) => {
      const categories = catRes.data.items.map((item) => ({ value: item.id, label: item.name }));
      const vendors = vendorRes.data.items.map((item) => ({ value: item.id, label: item.name }));
      setCategoryOptions(categories);
      setVendorOptions(vendors);
      setCreateInput((prev) => ({ ...prev, categoryId: categories[0] ? String(categories[0].value) : '' }));
    });
  }, []);

  const subtitle = useMemo(() => `${total} products in print catalog control center`, [total]);

  const onRowAction = async (id: string, action: ProductRowAction) => {
    if (action === 'clone') await productsService.cloneProduct(id);
    if (action === 'delete') await productsService.deleteProduct(id);
    if (action === 'new_window') window.open(`/products/${id}`, '_blank', 'noopener,noreferrer');
    if (action === 'preview') {
      const row = products.find((item) => item.id === id);
      if (row?.previewUrl) window.open(row.previewUrl, '_blank', 'noopener,noreferrer');
    }
    await loadProducts(query);
  };

  const onCreate = async () => {
    if (!createInput.name.trim() || !createInput.categoryId) return;
    const created = await productsService.createProduct(createInput);
    setCreatedProductId(created.data.id);
    setCreateSuccess(true);
    await loadProducts(query);
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={subtitle}
        actions={<><Button>Import</Button><Button>Export</Button><Button>Bulk Tools ▾</Button><PrimaryButton onClick={() => setOpenCreate(true)}>Add Product</PrimaryButton></>}
      />

      <FilterBar>
        <Input placeholder="Search name, slug, item #, model #" value={query.search ?? ''} onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value || undefined }))} />
        <Select options={[{ value: '', label: 'All categories' }, ...categoryOptions]} value={query.categoryId ?? ''} onChange={(e) => setQuery((prev) => ({ ...prev, categoryId: e.target.value || undefined }))} />
        <Select options={[{ value: '', label: 'All vendors' }, ...vendorOptions]} value={query.vendorId ?? ''} onChange={(e) => setQuery((prev) => ({ ...prev, vendorId: e.target.value || undefined }))} />
        <Select options={[{ value: 'all', label: 'Published: All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Unpublished' }]} value={query.published ?? 'all'} onChange={(e) => setQuery((prev) => ({ ...prev, published: e.target.value as ProductListQuery['published'] }))} />
        <Select options={[{ value: 'all', label: 'Global: All' }, { value: 'global', label: 'Global only' }, { value: 'channel', label: 'Channel-specific' }]} value={query.global ?? 'all'} onChange={(e) => setQuery((prev) => ({ ...prev, global: e.target.value as ProductListQuery['global'] }))} />
        <Button onClick={() => setQuery((prev) => ({ ...prev, uncategorized: !prev.uncategorized }))}>Uncategorized <span className="ml-2 rounded-full bg-panelMuted px-2 py-0.5 text-xs">{uncategorizedCount}</span></Button>
      </FilterBar>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading products...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyModuleState title="No products available" description="Import a catalog or create your first print product." action={<PrimaryButton onClick={() => setOpenCreate(true)}>Add Product</PrimaryButton>} />
      ) : null}

      {!loading && !error && products.length > 0 ? <ProductTable products={products} onAction={onRowAction} onToggle={async (id, key, value) => { await productsService.updateProduct(id, { [key]: value }); await loadProducts(query); }} /> : null}

      <BaseModal open={openCreate} onClose={() => { setOpenCreate(false); setCreateSuccess(false); }} title="Add Product">
        <ProductForm
          values={createInput}
          categoryOptions={categoryOptions}
          onChange={(changes) => setCreateInput((prev) => ({ ...prev, ...changes }))}
          onSubmit={onCreate}
          onCancel={() => setOpenCreate(false)}
          success={createSuccess}
          onReset={() => { setCreateSuccess(false); setCreateInput({ ...initialCreateInput, categoryId: createInput.categoryId }); }}
          onEditCreated={() => { if (createdProductId) window.location.href = `/products/${createdProductId}`; }}
        />
      </BaseModal>
    </div>
  );
}
