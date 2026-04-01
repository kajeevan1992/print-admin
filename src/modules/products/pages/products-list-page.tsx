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

const emptyForm: ProductFormValues = { name: '', category: categoryOptions[0], pages: '', units: '', width: '', height: '', bleed: '' };

export function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [vendor, setVendor] = useState('All Vendors');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);

  useEffect(() => {
    productsService.getProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.sku.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'All Categories' || product.category === category;
    const matchesVendor = vendor === 'All Vendors' || product.vendor === vendor;
    return matchesQuery && matchesCategory && matchesVendor;
  }), [products, query, category, vendor]);

  const handleToggle = async (id: string, key: 'published' | 'global', value: boolean) => {
    await productsService.updateProduct(id, { [key]: value });
    setProducts(await productsService.getProducts());
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await productsService.createProduct(form);
    setProducts(await productsService.getProducts());
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage print catalog items, global sync status, and publish controls."
        actions={<><Button>Import</Button><Button>Export</Button><PrimaryButton onClick={() => setOpen(true)}>+ Add Product</PrimaryButton></>}
      />

      <FilterBar onCreate={() => setOpen(true)}>
        <Input placeholder="Search product, SKU, category..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select options={['All Categories', ...categoryOptions]} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select options={['All Vendors', ...vendorOptions]} value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </FilterBar>

      <ProductTable products={filtered} onToggle={handleToggle} />

      <div className="mt-4 flex justify-end gap-2">
        <Button>Previous</Button><Button>1</Button><Button>2</Button><Button>Next</Button>
      </div>

      <BaseModal open={open} onClose={() => setOpen(false)} title="Create Product">
        <ProductForm
          values={form}
          onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          onCancel={() => setOpen(false)}
          onSubmit={handleCreate}
        />
      </BaseModal>
    </div>
  );
}
