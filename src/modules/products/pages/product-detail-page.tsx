'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedInput, setRelatedInput] = useState('');
  const [attributeType, setAttributeType] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [alternateLabel, setAlternateLabel] = useState('');
  const [alternateUrl, setAlternateUrl] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([productsService.getProduct(productId), productsService.listProducts({ perPage: 200 })])
      .then(([productResponse, allProductsResponse]) => {
        setProduct(productResponse.data);
        setAllProducts(allProductsResponse.data.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const persistProduct = async (changes: Partial<Product>) => {
    if (!product) return;
    const response = await productsService.updateProduct(product.id, changes);
    setProduct(response.data);
  };

  const relatedCandidates = useMemo(
    () => allProducts.filter((item) => item.id !== product?.id && !product?.relatedProducts.some((related) => related.id === item.id)),
    [allProducts, product]
  );

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
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Attribute type" value={attributeType} onChange={(e) => setAttributeType(e.target.value)} />
                <Input placeholder="Value" value={attributeValue} onChange={(e) => setAttributeValue(e.target.value)} />
                <Button
                  onClick={() => {
                    if (!attributeType.trim() || !attributeValue.trim()) return;
                    void persistProduct({
                      attributes: [
                        ...product.attributes,
                        { id: `attr-${Date.now()}`, type: attributeType.trim(), value: attributeValue.trim() }
                      ]
                    });
                    setAttributeType('');
                    setAttributeValue('');
                  }}
                >
                  Add Attribute
                </Button>
              </div>
              <div className="space-y-2">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input value={attribute.type} onChange={(e) => persistProduct({ attributes: product.attributes.map((item) => item.id === attribute.id ? { ...item, type: e.target.value } : item) })} />
                    <Input value={attribute.value} onChange={(e) => persistProduct({ attributes: product.attributes.map((item) => item.id === attribute.id ? { ...item, value: e.target.value } : item) })} />
                    <Button className="text-red-300" onClick={() => persistProduct({ attributes: product.attributes.filter((item) => item.id !== attribute.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Related Products' && (
            <ProductSectionCard title="Related Products">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  value={relatedInput}
                  onChange={(e) => setRelatedInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm"
                >
                  <option value="">Select related product</option>
                  {relatedCandidates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <Button
                  onClick={() => {
                    const related = relatedCandidates.find((item) => item.id === relatedInput);
                    if (!related) return;
                    void persistProduct({
                      relatedProducts: [
                        ...product.relatedProducts,
                        {
                          id: related.id,
                          name: related.name,
                          slug: related.slug,
                          thumbnail: related.thumbnail
                        }
                      ]
                    });
                    setRelatedInput('');
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.relatedProducts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <img src={item.thumbnail} alt={item.name} className="mb-2 h-20 w-full rounded border border-border object-cover" />
                    <p className="font-medium">{item.name}</p>
                    <Button className="mt-2 w-full text-red-300" onClick={() => persistProduct({ relatedProducts: product.relatedProducts.filter((related) => related.id !== item.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Alternate View' && (
            <ProductSectionCard title="Alternate View">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Label" value={alternateLabel} onChange={(e) => setAlternateLabel(e.target.value)} />
                <Input placeholder="Image URL" value={alternateUrl} onChange={(e) => setAlternateUrl(e.target.value)} />
                <Button
                  onClick={() => {
                    if (!alternateLabel.trim() || !alternateUrl.trim()) return;
                    void persistProduct({
                      alternateViews: [
                        ...product.alternateViews,
                        { id: `alt-${Date.now()}`, label: alternateLabel.trim(), url: alternateUrl.trim() }
                      ]
                    });
                    setAlternateLabel('');
                    setAlternateUrl('');
                  }}
                >
                  Add View
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.alternateViews.map((view) => (
                  <div key={view.id} className="rounded-lg border border-border p-3">
                    <img src={view.url} alt={view.label} className="mb-2 h-24 w-full rounded object-cover" />
                    <p className="text-sm">{view.label}</p>
                    <Button className="mt-2 w-full text-red-300" onClick={() => persistProduct({ alternateViews: product.alternateViews.filter((item) => item.id !== view.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Comments' && (
            <CommentsPanel
              comments={product.comments}
              onAdd={(message) => {
                void persistProduct({
                  comments: [
                    ...product.comments,
                    {
                      id: `comment-${Date.now()}`,
                      author: 'Admin User',
                      timestamp: new Date().toLocaleString(),
                      label: 'internal',
                      message
                    }
                  ]
                });
              }}
            />
          )}
        </div>

        <ProductRightSidebar product={product} onUpdate={persistProduct} />
      </div>
    </div>
  );
}
