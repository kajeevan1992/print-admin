'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { FilterBar } from '@/components/data-table/filter-bar';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { ProductForm } from '@/modules/products/components/product-form';
import { ProductTable, type ProductTableAction } from '@/modules/products/components/product-table';
import { productsService } from '@/services/products.service';
import { categoriesService } from '@/services/categories.service';
import { vendorsService } from '@/services/vendors.service';
import type { Product, ProductFormValues, ProductListQuery } from '@/modules/products/types';

const emptyForm: ProductFormValues = {
  name: '',
  categoryId: '',
  creationMethod: 'idml',
  productType: 'online',
  idmlFileName: '',
  printEditorTemplateName: '',
  pages: '1',
  units: 'mm',
  width: '0',
  height: '0',
  bleed: '0',
  parametricStandard: '',
  parametricSize: '',
  parametricAllowance: '',
  parametricMaterial: ''
};

export function ProductsListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<SelectOption[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [createdProductId, setCreatedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [params, setParams] = useState<ProductListQuery>({ page: 1, perPage: 20, sortBy: 'lastSavedAt', sortDirection: 'desc' });

  const loadProducts = useCallback(async (nextParams: ProductListQuery) => {
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
  }, []);

  useEffect(() => {
    void loadProducts(params);
  }, [loadProducts, params]);

  useEffect(() => {
    Promise.all([categoriesService.listCategories(), vendorsService.listVendors()]).then(([categories, vendors]) => {
      const catOptions = categories.data.items.map((item) => ({ value: item.id, label: item.name }));
      const venOptions = vendors.data.items.map((item) => ({ value: item.id, label: item.name }));
      setCategoryOptions(catOptions);
      setVendorOptions(venOptions);
      setForm((prev) => ({ ...prev, categoryId: catOptions[0] ? String(catOptions[0].value) : '' }));
    });
  }, []);

  const subtitle = useMemo(() => `${total} products total · Manage publishing, global assignment, and lifecycle actions`, [total]);

  const handleToggle = async (id: string, key: 'published' | 'isGlobal', value: boolean) => {
    await productsService.updateProduct(id, { [key]: value });
    await loadProducts(params);
  };

  const handleAction = async (id: string, action: ProductTableAction) => {
    if (action === 'clone') await productsService.cloneProduct(id);
    if (action === 'delete') await productsService.deleteProduct(id);
    if (action === 'edit-window') window.open(`/products/${id}`, '_blank', 'noopener,noreferrer');
    if (action === 'preview') window.open(products.find((item) => item.id === id)?.previewUrl || `/products/${id}`, '_blank', 'noopener,noreferrer');
    await loadProducts(params);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.categoryId) return;
    const created = await productsService.createProduct(form);
    setCreatedProductId(created.data.id);
    setCreationSuccess(true);
    await loadProducts(params);
  };

  const resetCreation = () => {
    setCreationSuccess(false);
    setCreatedProductId('');
    setForm({ ...emptyForm, categoryId: form.categoryId });
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={subtitle}
        actions={<><Button>Import</Button><Button>Export</Button><PrimaryButton onClick={() => setOpen(true)}>+ Add Product</PrimaryButton></>}
      />

      <FilterBar>
        <Input placeholder="Search by name / slug / item number" value={params.search ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, search: e.target.value || undefined }))} />
        <Select options={[{ value: '', label: 'All categories' }, { value: '__uncategorized__', label: 'Uncategorized' }, ...categoryOptions]} value={params.uncategorized ? '__uncategorized__' : params.categoryId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, uncategorized: e.target.value === '__uncategorized__' || undefined, categoryId: e.target.value && e.target.value !== '__uncategorized__' ? e.target.value : undefined }))} />
        <Select options={[{ value: '', label: 'All vendors' }, ...vendorOptions]} value={params.vendorId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, vendorId: e.target.value || undefined }))} />
      </FilterBar>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading products...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyModuleState title="No products yet" description="Create your first product with template upload, blank setup, or parametric standard generation." action={<PrimaryButton onClick={() => setOpen(true)}>Add Product</PrimaryButton>} />
      ) : null}

      {!loading && !error && products.length > 0 ? <ProductTable products={products} onToggle={handleToggle} onAction={handleAction} /> : null}

      <BaseModal open={open} onClose={() => { setOpen(false); setCreationSuccess(false); }} title="Add Product">
        <ProductForm
          values={form}
          categoryOptions={categoryOptions}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onCancel={() => setOpen(false)}
          onSubmit={handleCreate}
          success={creationSuccess}
          onReset={resetCreation}
        />
        {creationSuccess && createdProductId ? (
          <div className="mt-3 flex justify-end gap-2">
            <Button onClick={() => router.push(`/products/${createdProductId}`)}>Edit Product</Button>
            <Button onClick={() => setOpen(false)}>Return to Products</Button>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
