import { Button } from '@/components/ui/buttons';
import type { Product } from '@/modules/products/types';
import { ProductSectionCard } from './product-section-card';
import { TagManager } from './tag-manager';
import { productTagSuggestions } from '@/data/products';

export function ProductRightSidebar({ product }: { product: Product }) {
  const actions = [
    { label: 'Print Editor', disabled: product.productType === 'static' },
    { label: 'Item Manager', disabled: false },
    { label: 'Template Data', disabled: false },
    { label: 'Remove Thumbnail', disabled: false },
    { label: 'Download PDF', disabled: !product.actionState.canDownloadPdf },
    { label: 'Download Low-res Proof', disabled: false },
    { label: 'Download Assets', disabled: false }
  ];

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Meta">
        <p className="mb-2 text-sm text-textMuted">Last Saved: {product.lastSavedAt}</p>
        <Button className="w-full" disabled={!product.actionState.canPreview}>Preview</Button>
      </ProductSectionCard>

      <ProductSectionCard title="Thumbnail">
        <img src={product.thumbnail} alt={product.name} className="mb-2 h-36 w-full rounded border border-border object-cover" />
        <Button className="w-full">Reload Thumbnail</Button>
      </ProductSectionCard>

      <ProductSectionCard title="Actions">
        <div className="grid gap-2">
          {actions.map((action) => <Button key={action.label} disabled={action.disabled} className="justify-start">{action.label}</Button>)}
        </div>
      </ProductSectionCard>

      <TagManager tags={product.tags} suggested={productTagSuggestions} />

      <ProductSectionCard title="Inventory">
        <p className="text-sm">On Hand Quantity: {product.inventory.onHandQuantity}</p>
        <p className="text-sm">Reorder Quantity: {product.inventory.reorderQuantity}</p>
      </ProductSectionCard>

      <ProductSectionCard title="AccuZip Config">
        <p className="text-sm text-textMuted">Placeholder block for AccuZip settings and mapping.</p>
      </ProductSectionCard>
    </div>
  );
}
