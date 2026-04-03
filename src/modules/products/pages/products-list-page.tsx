'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { FilterBar } from '@/components/data-table/filter-bar';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { ProductForm } from '@/modules/products/components/product-form';
import { ProductTable } from '@/modules/products/components/product-table';
import { productsService } from '@/services/products.service';
import { categoriesService } from '@/services/categories.service';
import { vendorsService } from '@/services/vendors.service';
import type { Product, ProductFormValues, ProductListQuery } from '@/modules/products/types';

const emptyForm: ProductFormValues = {
  creationMode: 'templated',
  name: '',
  slug: '',
  description: '',
  productType: 'templated',
  categoryId: '',
  vendorId: '',
  pages: '1',
  units: 'mm',
  width: '0',
  height: '0',
  bleed: '0'
};

export function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [params, setParams] = useState<ProductListQuery>({ page: 1, perPage: 20, sortBy: 'updatedAt', sortDirection: 'desc' });

  const loadProducts = async (nextParams: ProductListQuery) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productsService.listProducts(nextParams);
      setProducts(response.data.items);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(params);
  }, [params]);

  useEffect(() => {
    Promise.all([categoriesService.listCategories(), vendorsService.listVendors()]).then(([categories, vendors]) => {
      const cat = categories.data.items.map((item) => item.id);
      const ven = vendors.data.items.map((item) => item.id);
      setCategoryOptions(cat);
      setVendorOptions(ven);
      setForm((prev) => ({ ...prev, categoryId: cat[0] ?? '', vendorId: ven[0] ?? '' }));
    });
  }, []);

  const subtitle = useMemo(() => `${total} products total · API-ready list query active`, [total]);

  const handleToggle = async (id: string, key: 'published' | 'isGlobal', value: boolean) => {
    await productsService.updateProduct(id, { [key]: value });
    await loadProducts(params);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    await productsService.createProduct(form);
    setForm((prev) => ({ ...emptyForm, categoryId: prev.categoryId, vendorId: prev.vendorId }));
    setOpen(false);
    await loadProducts(params);
  };

  return (
    <div>
      <PageHeader
        title="Products Control Center"
        subtitle={subtitle}
        actions={<><Button>Import</Button><Button>Export</Button><PrimaryButton onClick={() => setOpen(true)}>+ Add Product</PrimaryButton></>}
      />

      <FilterBar>
        <Input placeholder="Search by name, slug, item number..." value={params.search ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, search: e.target.value || undefined }))} />
        <Select options={['all', ...categoryOptions]} value={params.categoryId ?? 'all'} onChange={(e) => setParams((prev) => ({ ...prev, categoryId: e.target.value === 'all' ? undefined : e.target.value }))} />
        <Select options={['all', ...vendorOptions]} value={params.vendorId ?? 'all'} onChange={(e) => setParams((prev) => ({ ...prev, vendorId: e.target.value === 'all' ? undefined : e.target.value }))} />
        <Select options={['all', 'true', 'false']} value={params.published === undefined ? 'all' : String(params.published)} onChange={(e) => setParams((prev) => ({ ...prev, published: e.target.value === 'all' ? undefined : e.target.value === 'true' }))} />
        <Select options={['all', 'true', 'false']} value={params.isGlobal === undefined ? 'all' : String(params.isGlobal)} onChange={(e) => setParams((prev) => ({ ...prev, isGlobal: e.target.value === 'all' ? undefined : e.target.value === 'true' }))} />
      </FilterBar>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading products...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyModuleState title="No products match current filters" description="Try adjusting filters or create a new product." action={<PrimaryButton onClick={() => setOpen(true)}>Add Product</PrimaryButton>} />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <>
          <div className="mb-3 text-sm text-textMuted">Selected: {selected.length}</div>
          <ProductTable
            products={products}
            selected={selected}
            onSelect={(id, checked) => setSelected((prev) => checked ? [...prev, id] : prev.filter((item) => item !== id))}
            onToggle={handleToggle}
          />
        </>
      ) : null}

      <BaseModal open={open} onClose={() => setOpen(false)} title="Create Product">
        <ProductForm
          values={form}
          categoryOptions={categoryOptions}
          vendorOptions={vendorOptions}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onCancel={() => setOpen(false)}
          onSubmit={handleCreate}
        />
      </BaseModal>
    </div>
  );
}
