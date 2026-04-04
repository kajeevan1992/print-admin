'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductHeader } from '@/modules/products/components/product-header';
import { ProductTabs } from '@/modules/products/components/product-tabs';
import { ProductInfoForm } from '@/modules/products/components/product-info-form';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { PrintEditorForm } from '@/modules/products/components/print-editor-form';
import { CommentsPanel } from '@/modules/products/components/comments-panel';
import { ProductRightSidebar } from '@/modules/products/components/product-right-sidebar';
import { productsService } from '@/services/products.service';
import type { Product } from '@/modules/products/types';

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState('Product Information');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedInput, setRelatedInput] = useState('');
  const [attributeType, setAttributeType] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [altLabel, setAltLabel] = useState('');
  const [altUrl, setAltUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getProduct(productId);
      setProduct(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (changes: Partial<Product>) => {
    if (!product) return;
    const res = await productsService.updateProduct(product.id, changes);
    setProduct(res.data);
  };

  if (loading) return <ProductSectionCard title="Loading">Loading product...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product) return <EmptyModuleState title="Product not found" description="Product may have been removed." />;

  return (
    <div>
      <ProductHeader product={product} onSave={() => update({})} onCancel={() => window.location.assign('/products')} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <ProductTabs active={active} onChange={setActive} />

          {active === 'Product Information' ? <ProductInfoForm product={product} onUpdate={update} /> : null}

          {active === 'Print Editor' ? <PrintEditorForm product={product} onUpdate={update} /> : null}

          {active === 'Attributes' ? (
            <ProductSectionCard title="Attributes">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={attributeType} onChange={(e) => setAttributeType(e.target.value)} placeholder="Attribute type" />
                <Input value={attributeValue} onChange={(e) => setAttributeValue(e.target.value)} placeholder="Value" />
                <Button onClick={async () => { if (!attributeType.trim() || !attributeValue.trim()) return; await productsService.addProductAttribute(product.id, { type: attributeType, value: attributeValue }); setAttributeType(''); setAttributeValue(''); await load(); }}>Add Attribute</Button>
              </div>
              <div className="space-y-2">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_1fr_auto]">
                    <span>{attribute.type}</span>
                    <span className="text-textMuted">{attribute.value}</span>
                    <Button className="text-red-300" onClick={async () => { await productsService.removeProductAttribute(product.id, attribute.id); await load(); }}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          ) : null}

          {active === 'Related Products' ? (
            <ProductSectionCard title="Related Products">
              <div className="mb-3 flex gap-2">
                <Input value={relatedInput} onChange={(e) => setRelatedInput(e.target.value)} placeholder="Product ID or slug" />
                <Button onClick={async () => {
                  if (!relatedInput.trim()) return;
                  await productsService.addRelatedProduct(product.id, {
                    id: relatedInput,
                    name: `Related ${relatedInput}`,
                    slug: relatedInput,
                    thumbnail: 'https://placehold.co/80x80/1f2937/ffffff?text=RP'
                  });
                  setRelatedInput('');
                  await load();
                }}>Add Related Product</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.relatedProducts.map((related) => (
                  <div key={related.id} className="rounded-lg border border-border p-3">
                    <img src={related.thumbnail} alt={related.name} className="mb-2 h-20 w-full rounded object-cover" />
                    <p className="font-medium">{related.name}</p>
                    <p className="text-xs text-textMuted">{related.slug}</p>
                    <Button className="mt-2 w-full text-red-300" onClick={async () => { await productsService.removeRelatedProduct(product.id, related.id); await load(); }}>Remove</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          ) : null}

          {active === 'Alternate View' ? (
            <ProductSectionCard title="Alternate Views">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={altLabel} onChange={(e) => setAltLabel(e.target.value)} placeholder="Label" />
                <Input value={altUrl} onChange={(e) => setAltUrl(e.target.value)} placeholder="Image URL" />
                <Button onClick={async () => { if (!altLabel.trim() || !altUrl.trim()) return; await productsService.addAlternateView(product.id, { label: altLabel, url: altUrl }); setAltLabel(''); setAltUrl(''); await load(); }}>Add View</Button>
              </div>
              {product.alternateViews.length === 0 ? <p className="text-sm text-textMuted">No alternate views yet.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {product.alternateViews.map((view) => (
                    <div key={view.id} className="rounded-lg border border-border p-3">
                      <img src={view.url} alt={view.label} className="mb-2 h-24 w-full rounded object-cover" />
                      <div className="flex items-center justify-between">
                        <p>{view.label}</p>
                        <Button className="text-red-300" onClick={async () => { await productsService.removeAlternateView(product.id, view.id); await load(); }}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ProductSectionCard>
          ) : null}

          {active === 'Comments' ? <CommentsPanel comments={product.comments} onAdd={async (message) => { await productsService.addProductComment(product.id, message); await load(); }} /> : null}
        </div>

        <ProductRightSidebar product={product} />
      </div>
    </div>
  );
}
