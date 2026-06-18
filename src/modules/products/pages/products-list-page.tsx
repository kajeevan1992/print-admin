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
import { pricingImportService } from '@/services/pricing-import.service';
import type { Product, ProductFormValues, ProductListQuery } from '@/modules/products/types';

const emptyForm: ProductFormValues = {
  name: '', categoryId: '', creationMethod: 'idml', productType: 'online', idmlFileName: '', printEditorTemplateName: '', pages: '1', units: 'mm', width: '0', height: '0', bleed: '0', parametricStandard: '', parametricSize: '', parametricAllowance: '', parametricMaterial: '', templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: '250', turnaround: 'standard', configValues: {}
};

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProductsListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<SelectOption[]>([]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importSlug, setImportSlug] = useState('');
  const [importName, setImportName] = useState('');
  const [importMarkup, setImportMarkup] = useState('35');
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [createdProductId, setCreatedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState<ProductListQuery>({ page: 1, perPage: 20, sortBy: 'lastSavedAt', sortDirection: 'desc' });

  const loadProducts = useCallback(async (nextParams: ProductListQuery) => {
    setLoading(true); setError(null);
    try { const response = await productsService.listProducts(nextParams); setProducts(response.data.items); setTotal(response.meta.total); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load products'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadProducts(params); }, [loadProducts, params]);

  useEffect(() => {
    Promise.all([categoriesService.listCategories(), vendorsService.listVendors()])
      .then(([categories, vendors]) => {
        const catOptions = categories.data.items.map((item) => ({ value: item.id, label: item.name }));
        const venOptions = vendors.data.items.map((item) => ({ value: item.id, label: item.name }));
        setCategoryOptions(catOptions); setVendorOptions(venOptions);
        setForm((prev) => ({ ...prev, categoryId: catOptions[0] ? String(catOptions[0].value) : '' }));
      })
      .catch((err) => { setError(err instanceof Error ? err.message : 'Failed to load product page options'); });
  }, []);

  const subtitle = useMemo(() => `${total} products total · Manage publishing, global assignment, and lifecycle actions`, [total]);

  async function handleCsvImport() {
    if (!csvFile) { setImportError('CSV file is required. Product slug/name can be left blank when the CSV includes Product Slug, Product Name, Category Slug or Storefront Path columns.'); return; }
    setImporting(true); setImportError(null); setNotice(null);
    try {
      const result = await pricingImportService.importCsvPricing({ file: csvFile, productSlug: importSlug.trim(), productName: importName.trim(), markupPercent: Number(importMarkup || 0) });
      const importedLabel = result.productCount && result.productCount > 1 ? `${result.productCount} products` : (result.productName || importName || result.productSlug || 'product');
      setNotice(`Imported CSV pricing for ${importedLabel}. Category/product slug mapping applied when present.`); setImportOpen(false); setCsvFile(null); await loadProducts(params);
    } catch (err) { setImportError(err instanceof Error ? err.message : 'CSV pricing import failed.'); }
    finally { setImporting(false); }
  }

  function handleExport() {
    if (!products.length) { setNotice('No products available to export.'); return; }
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'Category Slug', 'Product Slug', 'Storefront Path', 'Name', 'Status', 'Published', 'Global', 'Category ID', 'Product Type', 'Price From', 'Currency', 'Updated'],
      ...products.map((product) => [product.id, product.categorySlug || '', product.slug, product.categorySlug ? `/${product.categorySlug}/${product.slug}` : `/${product.slug}`, product.name, product.status, product.published ? 'yes' : 'no', product.isGlobal ? 'yes' : 'no', product.categoryId, product.productType, product.priceMapping?.basePrice ?? '', product.priceMapping?.currency ?? 'GBP', product.lastSavedAt || product.updatedAt]),
    ]);
    setNotice(`Exported ${products.length} visible products.`);
  }

  const handleToggle = async (id: string, key: 'published' | 'isGlobal', value: boolean) => {
    setError(null); setNotice(null);
    try { await productsService.updateProduct(id, { [key]: value }); setNotice(`Product ${key === 'published' ? (value ? 'published' : 'unpublished') : 'global flag updated'}.`); await loadProducts(params); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update product'); }
  };

  const handleAction = async (id: string, action: ProductTableAction) => {
    setError(null); setNotice(null);
    try {
      if (action === 'clone') { await productsService.cloneProduct(id); setNotice('Product cloned.'); }
      if (action === 'delete') { const product = products.find((item) => item.id === id); if (product) setPendingDeleteProduct(product); return; }
      if (action === 'edit-window') window.open(`/products/${id}`, '_blank', 'noopener,noreferrer');
      if (action === 'preview') window.open(`/products/${id}/preview`, '_blank', 'noopener,noreferrer');
      await loadProducts(params);
    } catch (err) { setError(err instanceof Error ? err.message : 'Product action failed'); }
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct) return;
    setSaving(true); setError(null); setNotice(null);
    try { await productsService.deleteProduct(pendingDeleteProduct.id); setNotice(`Deleted product ${pendingDeleteProduct.name}.`); setPendingDeleteProduct(null); await loadProducts(params); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete product'); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.categoryId || saving) return;
    setSaving(true); setError(null); setNotice(null);
    try { const created = await productsService.createProduct(form); setCreatedProductId(created.data.id); setCreationSuccess(true); setNotice(`Created product ${created.data.name}.`); await loadProducts(params); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to create product'); }
    finally { setSaving(false); }
  };

  const resetCreation = () => { setCreationSuccess(false); setCreatedProductId(''); setForm({ ...emptyForm, categoryId: form.categoryId }); };
  const closeCreateWizard = () => { setOpen(false); setCreationSuccess(false); setCreatedProductId(''); setForm({ ...emptyForm, categoryId: form.categoryId }); };

  return (
    <div>
      <PageHeader title="Products" subtitle={subtitle} actions={<><Button onClick={() => setImportOpen(true)}>Import CSV Pricing</Button><Button onClick={handleExport} disabled={loading || products.length === 0}>Export</Button><PrimaryButton onClick={() => setOpen(true)}>+ Add Product</PrimaryButton></>} />
      <CatalogPageDiagnostics resourceLabel="Products" loading={loading} error={error} itemCount={products.length} />
      {notice ? <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}

      <FilterBar>
        <Input placeholder="Search by name / slug / item number" value={params.search ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, search: e.target.value || undefined }))} />
        <Select options={[{ value: '', label: 'All categories' }, { value: '__uncategorized__', label: 'Uncategorized' }, ...categoryOptions]} value={params.uncategorized ? '__uncategorized__' : params.categoryId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, uncategorized: e.target.value === '__uncategorized__' || undefined, categoryId: e.target.value && e.target.value !== '__uncategorized__' ? e.target.value : undefined }))} />
        <Select options={[{ value: '', label: 'All vendors' }, ...vendorOptions]} value={params.vendorId ?? ''} onChange={(e) => setParams((prev) => ({ ...prev, vendorId: e.target.value || undefined }))} />
      </FilterBar>

      {!loading && !error && products.length > 0 ? <ProductTable products={products} onToggle={handleToggle} onAction={handleAction} /> : null}
      {!loading && !error && products.length === 0 ? <EmptyModuleState title="No products yet" description="Create your first storefront product or import pricing from a CSV matrix." actionLabel="Add Product" onAction={() => setOpen(true)} /> : null}

      <BaseModal open={open} onClose={closeCreateWizard} title="Add Product">
        <ProductForm values={form} categoryOptions={categoryOptions} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} onCancel={() => { if (creationSuccess && createdProductId) router.push(`/products/${createdProductId}`); else closeCreateWizard(); }} onSubmit={handleCreate} success={creationSuccess} onReset={resetCreation} />
        {!creationSuccess ? <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-4"><Button onClick={closeCreateWizard} disabled={saving}>Cancel</Button><PrimaryButton onClick={handleCreate} disabled={saving || !form.name.trim() || !form.categoryId}>{saving ? 'Creating…' : 'Create Product'}</PrimaryButton></div> : null}
      </BaseModal>

      <BaseModal open={importOpen} onClose={() => setImportOpen(false)} title="Import CSV Pricing">
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">For bulk mapped imports, add CSV columns named Category Slug, Product Slug, Product Name and Storefront Path. Example Storefront Path: /same-day-prints/standard-business-cards.</div>
          <Input label="Product Slug Override" value={importSlug} onChange={(e) => setImportSlug(e.target.value)} placeholder="Optional. Leave blank to use CSV Product Slug." />
          <Input label="Product Name Override" value={importName} onChange={(e) => setImportName(e.target.value)} placeholder="Optional. Leave blank to use CSV Product Name." />
          <Input label="Markup %" value={importMarkup} onChange={(e) => setImportMarkup(e.target.value)} placeholder="35" />
          <div className="space-y-2"><label className="text-sm font-medium">CSV File</label><input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-border bg-panel px-3 py-2 text-sm" /></div>
          {importError ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{importError}</div> : null}
          <div className="flex justify-end gap-2 pt-2"><Button onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button><PrimaryButton onClick={handleCsvImport} disabled={importing || !csvFile}>{importing ? 'Importing…' : 'Import Pricing CSV'}</PrimaryButton></div>
        </div>
      </BaseModal>

      <BaseModal open={Boolean(pendingDeleteProduct)} onClose={() => setPendingDeleteProduct(null)} title="Delete Product">
        <div className="space-y-4"><p className="text-sm text-textMuted">Delete <span className="font-semibold text-white">{pendingDeleteProduct?.name}</span>? This cannot be undone.</p><div className="flex justify-end gap-2"><Button onClick={() => setPendingDeleteProduct(null)} disabled={saving}>Cancel</Button><PrimaryButton onClick={confirmDeleteProduct} disabled={saving}>{saving ? 'Deleting…' : 'Delete Product'}</PrimaryButton></div></div>
      </BaseModal>
    </div>
  );
}
