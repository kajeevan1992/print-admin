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
import { CatalogPageDiagnostics } from '@/components/catalog/catalog-page-diagnostics';
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
  parametricMaterial: '',
  templateId: 'business-cards',
  materialId: 'silk-350',
  finishId: 'matt-lam',
  printerId: 'hp-indigo-7k',
  quantity: '250',
  turnaround: 'standard',
  configValues: {}
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
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
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
    Promise.all([categoriesService.listCategories(), vendorsService.listVendors()])
      .then(([categories, vendors]) => {
        const catOptions = categories.data.items.map((item) => ({ value: item.id, label: item.name }));
        const venOptions = vendors.data.items.map((item) => ({ value: item.id, label: item.name }));
        setCategoryOptions(catOptions);
        setVendorOptions(venOptions);
        setForm((prev) => ({ ...prev, categoryId: catOptions[0] ? String(catOptions[0].value) : '' }));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load product page options');
      });
  }, []);

  const subtitle = useMemo(() => `${total} products total · Manage publishing, global assignment, and lifecycle actions`, [total]);

  const handleToggle = async (id: string, key: 'published' | 'isGlobal', value: boolean) => {
    setError(null);
    setNotice(null);
    try {
      await productsService.updateProduct(id, { [key]: value });
      setNotice(`Product ${key === 'published' ? (value ? 'published' : 'unpublished') : 'global flag updated'}.`);
      await loadProducts(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  const handleAction = async (id: string, action: ProductTableAction) => {
    setError(null);
    setNotice(null);
    try {
      if (action === 'clone') {
        await productsService.cloneProduct(id);
        setNotice('Product cloned.');
      }
      if (action === 'delete') {
        const product = products.find((item) => item.id === id);
        if (product) setPendingDeleteProduct(product);
        return;
      }
      if (action === 'edit-window') window.open(`/products/${id}`, '_blank', 'noopener,noreferrer');
      if (action === 'preview') window.open(products.find((item) => item.id === id)?.previewUrl || `/products/${id}`, '_blank', 'noopener,noreferrer');
      await loadProducts(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product action failed');
    }
  };


  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await productsService.deleteProduct(pendingDeleteProduct.id);
      setNotice(`Deleted product ${pendingDeleteProduct.name}.`);
      setPendingDeleteProduct(null);
      await loadProducts(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.categoryId || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await productsService.createProduct(form);
      setCreatedProductId(created.data.id);
      setCreationSuccess(true);
      setNotice(`Created product ${created.data.name}.`);
      await loadProducts(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
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

      <CatalogPageDiagnostics resourceLabel="Products" loading={loading} error={error} itemCount={products.length} />
      {notice ? <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}

      <FilterBar>
        <Input placeholder="Search by name / slug / item number" value={params.search ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, search: e.target.value || undefined }))} />
        <Select options={[{ value: '', label: 'All categories' }, { value: '__uncategorized__', label: 'Uncategorized' }, ...categoryOptions]} value={params.uncategorized ? '__uncategorized__' : params.categoryId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, uncategorized: e.target.value === '__uncategorized__' || undefined, categoryId: e.target.value && e.target.value !== '__uncategorized__' ? e.target.value : undefined }))} />
        <Select options={[{ value: '', label: 'All vendors' }, ...vendorOptions]} value={params.vendorId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, vendorId: e.target.value || undefined }))} />
      </FilterBar>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading products...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyModuleState title="No products yet" description="Create your first product with template upload, blank setup, || parametric standard generation." action={<PrimaryButton onClick={() => setOpen(true)}>Add Product</PrimaryButton>} />
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

      <BaseModal open={Boolean(pendingDeleteProduct)} onClose={() => setPendingDeleteProduct(null)} title="Delete Product">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="font-semibold">Delete {pendingDeleteProduct?.name}?</p>
            <p className="mt-2 text-red-100/80">This removes the product from the tenant catalog database. This action cannot be undone from the dashboard.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPendingDeleteProduct(null)} disabled={saving}>Cancel</Button>
            <Button className="border-red-500/40 text-red-200 hover:bg-red-500/10" onClick={confirmDeleteProduct} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Product'}
            </Button>
          </div>
        </div>
      </BaseModal>

    </div>
  );
}
