'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductHeader } from '@/modules/products/components/product-header';
import { ProductTabs } from '@/modules/products/components/product-tabs';
import { ProductInfoForm } from '@/modules/products/components/product-info-form';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { CommentsPanel } from '@/modules/products/components/comments-panel';
import { PrintEditorForm } from '@/modules/products/components/print-editor-form';
import { ProductRightSidebar } from '@/modules/products/components/product-right-sidebar';
import { productsService } from '@/services/products.service';
import type { Product } from '@/modules/products/types';

const defaultTab = 'Product Information';

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState(defaultTab);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedInput, setRelatedInput] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    productsService
      .getProduct(productId)
      .then((productResponse) => {
        setProduct(productResponse.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const persistProduct = async (changes: Partial<Product>) => {
    if (!product) return;
    const response = await productsService.updateProduct(product.id, changes);
    setProduct(response.data);
  };

  if (loading) return <ProductSectionCard title="Loading">Loading product data...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product) return <EmptyModuleState title="Product not found" description="This product may have been removed." />;

  return (
    <div>
      <ProductHeader product={product} onSave={() => persistProduct({})} onCancel={() => setActive(defaultTab)} />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <ProductTabs active={active} onChange={setActive} />

          {active === 'Product Information' && <ProductInfoForm product={product} onUpdate={persistProduct} />}

          {active === 'Print Editor' && <PrintEditorForm product={product} onUpdate={persistProduct} />}

          {active === 'Attributes' && (
            <ProductSectionCard title="Attributes">
              <div className="mb-3 flex justify-end"><Button>Add Attribute</Button></div>
              <div className="space-y-2">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input value={attribute.type} onChange={() => undefined} />
                    <Input value={attribute.value} onChange={() => undefined} />
                    <Button className="text-red-300">Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Related Products' && (
            <ProductSectionCard title="Related Products">
              <div className="mb-3 flex gap-2">
                <Input placeholder="Add related product by ID or selector" value={relatedInput} onChange={(e) => setRelatedInput(e.target.value)} />
                <Button>Add</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.relatedProducts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <img src={item.thumbnail} alt={item.name} className="mb-2 h-20 w-full rounded border border-border object-cover" />
                    <p className="font-medium">{item.name}</p>
                    <Button className="mt-2 w-full text-red-300">Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Alternate View' && (
            <ProductSectionCard title="Alternate View">
              <p className="mb-3 text-sm text-textMuted">Image/mockup placeholder management UI.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.alternateViews.map((view) => (
                  <div key={view.id} className="rounded-lg border border-border p-3">
                    <img src={view.url} alt={view.label} className="mb-2 h-24 w-full rounded object-cover" />
                    <p className="text-sm">{view.label}</p>
                  </div>
                ))}
                <button className="rounded-lg border border-dashed border-border p-6 text-sm text-textMuted">+ Add Alternate View</button>
              </div>
            </ProductSectionCard>
          )}

          {active === 'Comments' && <CommentsPanel comments={product.comments} />}
        </div>

        <ProductRightSidebar product={product} />
      </div>
    </div>
  );
}
