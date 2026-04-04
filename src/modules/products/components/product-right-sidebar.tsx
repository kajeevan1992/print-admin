import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from './product-section-card';
import { TagManager } from './tag-manager';
import type { Product } from '@/modules/products/types';
import { suggestedProductTags } from '@/data/products';

export function ProductRightSidebar({ product }: { product: Product }) {
  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product Status">
        <div className="space-y-2 text-sm">
          <p className="text-textMuted">Last Saved: {product.lastSavedAt}</p>
          <Button className="w-full">Preview</Button>
        </div>
      </ProductSectionCard>

      <ProductSectionCard title="Thumbnail">
        <img src={product.thumbnail} alt={product.name} className="mb-2 h-40 w-full rounded border border-border object-cover" />
        <Button className="w-full">Reload Thumbnail</Button>
      </ProductSectionCard>

      <ProductSectionCard title="Actions Menu">
        <div className="grid gap-2 text-sm">
          {['Print Editor', 'Item Manager', 'Template Data', 'Remove Thumbnail', 'Download PDF', 'Download Low-res Proof', 'Download Assets'].map((item) => (
            <Button key={item} className="justify-start text-left">{item}</Button>
          ))}
        </div>
      </ProductSectionCard>

      <TagManager tags={product.tags} suggested={suggestedProductTags} />

      <ProductSectionCard title="Inventory">
        <div className="space-y-2 text-sm">
          <p>On Hand Quantity: {product.inventory.onHandQuantity}</p>
          <p>Reorder Quantity: {product.inventory.reorderQuantity}</p>
        </div>
      </ProductSectionCard>

      <ProductSectionCard title="AccuZip Configuration">
        <p className="text-sm text-textMuted">Placeholder for AccuZip integration settings.</p>
      </ProductSectionCard>
    </div>
  );
}
