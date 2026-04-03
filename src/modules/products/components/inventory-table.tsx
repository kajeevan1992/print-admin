import type { ProductInventory } from '@/modules/products/types';
import { ProductSectionCard } from './product-section-card';

export function InventoryTable({ inventory }: { inventory: ProductInventory }) {
  return (
    <ProductSectionCard title="Inventory">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>On Hand Quantity: {inventory.onHandQuantity}</p>
        <p>Reorder Quantity: {inventory.reorderQuantity}</p>
      </div>
    </ProductSectionCard>
  );
}
