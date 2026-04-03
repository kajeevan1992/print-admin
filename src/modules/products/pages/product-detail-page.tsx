'use client';

import { useEffect, useState } from 'react';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { productsService } from '@/services/products.service';
import { suggestedProductTags } from '@/data/products';
import { ProductHeader } from '@/modules/products/components/product-header';
import { ProductTabs } from '@/modules/products/components/product-tabs';
import { ProductInfoForm } from '@/modules/products/components/product-info-form';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { CommentsPanel } from '@/modules/products/components/comments-panel';
import { TagManager } from '@/modules/products/components/tag-manager';
import { InventoryTable } from '@/modules/products/components/inventory-table';
import type { Product, ProductAttribute, ProductComment, ProductInventory, RelatedProduct } from '@/modules/products/types';

const defaultTab = 'Product Information';

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState(defaultTab);
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      productsService.getProduct(productId),
      productsService.getProductAttributes(productId),
      productsService.getRelatedProducts(productId),
      productsService.getProductComments(productId),
      productsService.getProductInventory(productId)
    ])
      .then(([productResponse, attrsResponse, relatedResponse, commentsResponse, inventoryResponse]) => {
        setProduct(productResponse.data);
        setAttributes(attrsResponse.data.items);
        setRelated(relatedResponse.data.items);
        setComments(commentsResponse.data.items);
        setInventory(inventoryResponse.data.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const persistProduct = async (changes: Partial<Product>) => {
    if (!product) return;
    const response = await productsService.updateProduct(product.id, { ...changes, updatedAt: new Date().toISOString().slice(0, 10) });
    setProduct(response.data);
  };

  if (loading) return <ProductSectionCard title="Loading">Loading product data...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product) return <EmptyModuleState title="Product not found" description="This product may have been removed." />;

  return (
    <div>
      <ProductHeader product={product} onSave={() => persistProduct({})} />
      <ProductTabs active={active} onChange={setActive} />

      {active === 'Product Information' && <ProductInfoForm product={product} onUpdate={persistProduct} />}

      {active === 'Print Editor' && (
        <EmptyModuleState
          title="Print Editor integration ready"
          description="This panel will connect to future template/editor tooling for layers, artwork zones, and proofing workflows."
          action={<PrimaryButton>Open Print Editor</PrimaryButton>}
        />
      )}

      {active === 'Attributes' && (
        <ProductSectionCard title="Attributes">
          <div className="mb-3 flex justify-end"><Button>Add Attribute</Button></div>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (row) => row.name },
              { key: 'type', header: 'Type', render: (row) => row.type },
              { key: 'values', header: 'Values', render: (row) => row.values.join(', ') },
              { key: 'required', header: 'Required', render: (row) => (row.required ? 'Yes' : 'No') },
              { key: 'action', header: 'Action', render: () => <button className="text-textMuted">Edit</button> }
            ]}
            rows={attributes}
            rowKey={(row) => row.id}
          />
        </ProductSectionCard>
      )}

      {active === 'Related Products' && (
        <ProductSectionCard title="Related Products">
          <div className="mb-3 flex gap-2"><Input placeholder="Search product to relate..." /><Button>Add Related Product</Button></div>
          {related.length === 0 ? <EmptyModuleState title="No related products" description="Link complementary items to increase AOV and enable merchandising bundles." /> : (
            <DataTable
              columns={[
                { key: 'thumb', header: '', render: (row) => <span className="rounded bg-panelMuted px-2 py-1 text-xs">{row.thumbnail}</span> },
                { key: 'name', header: 'Name', render: (row) => row.name },
                { key: 'category', header: 'Category', render: (row) => row.category },
                { key: 'slug', header: 'Slug', render: (row) => row.slug },
                { key: 'remove', header: 'Action', render: () => <button className="text-red-300">Remove</button> }
              ]}
              rows={related}
              rowKey={(row) => row.id}
            />
          )}
        </ProductSectionCard>
      )}

      {active === 'Alternative View' && (
        <EmptyModuleState title="Alternative Views" description="Upload alternate product images, angle previews, and material closeups." action={<Button>Add New Image</Button>} />
      )}

      {active === 'Comments' && <CommentsPanel comments={comments} />}
      {active === 'Tags' && <TagManager tags={product.tags} suggested={suggestedProductTags} />}
      {active === 'Inventory' && <InventoryTable inventory={inventory} />}
    </div>
  );
}
