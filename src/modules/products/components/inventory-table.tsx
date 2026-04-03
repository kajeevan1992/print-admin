import { DataTable } from '@/components/data-table/data-table';
import type { ProductInventory } from '@/modules/products/types';
import { ProductSectionCard } from './product-section-card';

const statusStyle = {
  'in-stock': 'text-emerald-300',
  low: 'text-amber-300',
  'out-of-stock': 'text-red-300'
};

export function InventoryTable({ inventory }: { inventory: ProductInventory[] }) {
  return (
    <ProductSectionCard title="Inventory Records">
      <DataTable
        columns={[
          { key: 'sku', header: 'SKU', render: (row) => row.sku },
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse },
          { key: 'quantity', header: 'Quantity', render: (row) => row.quantity.toLocaleString() },
          { key: 'threshold', header: 'Reorder Threshold', render: (row) => row.reorderThreshold },
          { key: 'availability', header: 'Availability', render: (row) => <span className={statusStyle[row.availability]}>{row.availability}</span> }
        ]}
        rows={inventory}
        rowKey={(row) => row.id}
      />
    </ProductSectionCard>
  );
}
