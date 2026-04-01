'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { ProductInfoForm } from '@/modules/products/components/product-info-form';
import { productsService } from '@/services/products.service';
import type { Product, ProductAttribute } from '@/modules/products/types';

const tabList = ['Product Information', 'Print Editor', 'Attributes', 'Related Products', 'Alternative View', 'Comments', 'Tags', 'Inventory'];

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState(tabList[0]);
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    productsService.getProductById(productId).then((item) => setProduct(item));
    productsService.getProductAttributes().then(setAttributes);
  }, [productId]);

  const subtitle = useMemo(() => {
    if (!product) return 'Loading...';
    return `SKU ${product.sku} · ${product.category} · Last updated ${product.updatedAt}`;
  }, [product]);

  const persistProduct = async (changes: Partial<Product>) => {
    if (!product) return;
    const updated = await productsService.updateProduct(product.id, changes);
    if (updated) setProduct(updated);
  };

  if (!product) return <Card>Loading product...</Card>;

  return (
    <div>
      <PageHeader title={product.name} subtitle={subtitle} actions={<PrimaryButton onClick={() => persistProduct({ updatedAt: new Date().toISOString().slice(0, 10) })}>Save Changes</PrimaryButton>} />
      <Tabs tabs={tabList} active={active} onChange={setActive} />

      {active === 'Product Information' && <ProductInfoForm product={product} onUpdate={persistProduct} />}

      {active === 'Print Editor' && <Card><p className="mb-3 text-sm text-textMuted">Launch the full print editor to configure layers, bleed zones, and dynamic fields.</p><PrimaryButton>Open Print Editor</PrimaryButton></Card>}

      {active === 'Attributes' && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Attribute List</h3>
            <Button>Add Attribute</Button>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (row) => row.name },
              { key: 'type', header: 'Type', render: (row) => row.type },
              { key: 'required', header: 'Required', render: (row) => (row.required ? 'Yes' : 'No') }
            ]}
            rows={attributes}
            rowKey={(row) => row.id}
          />
        </Card>
      )}

      {active === 'Related Products' && <Card><div className="mb-3 flex gap-2"><Input placeholder="Search product to relate..." /><Button>Add</Button></div><EmptyState title="No related products" description="Add complementary products to improve upsell opportunities." /></Card>}
      {active === 'Alternative View' && <Card><EmptyState title="No alternative images yet" description="Upload alternate angle previews or material close-ups for this product." /></Card>}
      {['Comments', 'Tags', 'Inventory'].includes(active) && <Card><EmptyState title={`${active} module ready`} description="This panel is prepared for future API-connected workflows." /></Card>}
    </div>
  );
}
