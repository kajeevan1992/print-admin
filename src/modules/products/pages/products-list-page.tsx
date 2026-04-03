'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { FilterBar } from '@/components/data-table/filter-bar';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { ProductForm } from '@/modules/products/components/product-form';
import { ProductTable } from '@/modules/products/components/product-table';
import { categoryOptions, vendorOptions } from '@/data/products';
import { productsService } from '@/services/products.service';
import type { Product, ProductFormValues } from '@/modules/products/types';

const emptyForm: ProductFormValues = {
  creationMode: 'templated',
  name: '',
  category: categoryOptions[0] ?? 'Catalogs',
  vendor: vendorOptions[0] ?? 'BlueLine Print',
  pages: '',
  units: 'mm',
  width: '',
  height: '',
  bleed: ''
};

export function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [vendor, setVendor] = useState('All Vendors');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await productsService.getProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesQuery =
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.sku.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === 'All Categories' || product.category === category;
        const matchesVendor = vendor === 'All Vendors' || product.vendor === vendor;
        return matchesQuery && matchesCategory && matchesVendor;
      }),
    [products, query, category, vendor]
  );

  const handleToggle = async (id: string, key: 'published' | 'global', value: boolean) => {
    await productsService.updateProduct(id, { [key]: value });
    await loadProducts();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await productsService.createProduct(form);
      await loadProducts();
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage print catalog items, global sync status, and publish controls."
        actions={
          <>
            <Button>Import</Button>
            <Button>Export</Button>
            <PrimaryButton onClick={() => setOpen(true)}>+ Add Product</PrimaryButton>
          </>
        }
      />

      <FilterBar onCreate={() => setOpen(true)}>
        <Input placeholder="Search product, SKU, category..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select options={['All Categories', ...categoryOptions]} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select options={['All Vendors', ...vendorOptions]} value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </FilterBar>

      {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading products...</div> : <ProductTable products={filtered} onToggle={handleToggle} />}

      <BaseModal open={open} onClose={() => !submitting && setOpen(false)} title="Create Product">
        <ProductForm
          values={form}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onCancel={() => !submitting && setOpen(false)}
          onSubmit={handleCreate}
        />
      </BaseModal>
    </div>
  );
}
