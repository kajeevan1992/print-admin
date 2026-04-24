'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from './product-section-card';
import { TagManager } from './tag-manager';
import type { Product, ProductTag } from '@/modules/products/types';
import { suggestedProductTags } from '@/data/products';
import { Input } from '@/components/forms/input';

export function ProductRightSidebar({
  product,
  onUpdate
}: {
  product: Product;
  onUpdate?: (changes: Partial<Product>) => void;
}) {
  const [onHand, setOnHand] = useState(String(product.inventory.onHandQuantity));
  const [reorder, setReorder] = useState(String(product.inventory.reorderQuantity));

  const quickAction = (label: string) => {
    if (label === 'Preview' && product.previewUrl) window.open(product.previewUrl, '_blank', 'noopener,noreferrer');
    if (label === 'Remove Thumbnail') onUpdate?.({ thumbnail: 'https://placehold.co/96x96/111827/ffffff?text=PR' });
  };

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product Status">
        <div className="space-y-2 text-sm">
          <p className="text-textMuted">Last Saved: {product.lastSavedAt}</p>
          <Button className="w-full" onClick={() => quickAction('Preview')}>Preview</Button>
        </div>
      </ProductSectionCard>

      <ProductSectionCard title="Thumbnail">
        <img src={product.thumbnail} alt={product.name} className="mb-2 h-40 w-full rounded border border-border object-cover" />
        <Button className="w-full" onClick={() => onUpdate?.({ thumbnail: `${product.thumbnail}${product.thumbnail.includes('?') ? '&' : '?'}v=${Date.now()}` })}>Reload Thumbnail</Button>
      </ProductSectionCard>

      <ProductSectionCard title="Actions Menu">
        <div className="grid gap-2 text-sm">
          {['Print Editor', 'Item Manager', 'Template Data', 'Remove Thumbnail', 'Download PDF', 'Download Low-res Proof', 'Download Assets'].map((item) => (
            <Button key={item} className="justify-start text-left" onClick={() => quickAction(item)}>{item}</Button>
          ))}
        </div>
      </ProductSectionCard>

      <TagManager tags={product.tags} suggested={suggestedProductTags} onChange={(tags: ProductTag[]) => onUpdate?.({ tags })} />

      <ProductSectionCard title="Inventory">
        <div className="space-y-2 text-sm">
          <Input value={onHand} onChange={(e) => setOnHand(e.target.value)} placeholder="On hand quantity" />
          <Input value={reorder} onChange={(e) => setReorder(e.target.value)} placeholder="Reorder quantity" />
          <Button onClick={() => onUpdate?.({ inventory: { onHandQuantity: Number(onHand) || 0, reorderQuantity: Number(reorder) || 0 } })}>Save Inventory</Button>
        </div>
      </ProductSectionCard>

      <ProductSectionCard title="AccuZip Configuration">
        <p className="text-sm text-textMuted">Assign mailing and postal automation rules when AccuZip is enabled.</p>
      </ProductSectionCard>
    </div>
  );
}
