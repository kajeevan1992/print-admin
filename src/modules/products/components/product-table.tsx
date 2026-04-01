import Link from 'next/link';
import { DataTable } from '@/components/data-table/data-table';
import { Toggle } from '@/components/forms/toggle';
import type { Product } from '@/modules/products/types';

export function ProductTable({ products, onToggle }: { products: Product[]; onToggle: (id: string, key: 'published' | 'global', value: boolean) => void }) {
  return (
    <DataTable
      columns={[
        { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
        { key: 'category', header: 'Category', render: (row) => row.category },
        { key: 'vendor', header: 'Vendor', render: (row) => row.vendor },
        { key: 'price', header: 'Price', render: (row) => `$${row.price}` },
        { key: 'published', header: 'Published', render: (row) => <Toggle checked={row.published} onChange={(next) => onToggle(row.id, 'published', next)} /> },
        { key: 'global', header: 'Global', render: (row) => <Toggle checked={row.global} onChange={(next) => onToggle(row.id, 'global', next)} /> },
        { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt },
        { key: 'actions', header: 'Actions', render: (row) => <Link className="text-accent" href={`/products/${row.id}`}>Preview</Link> }
      ]}
      rows={products}
      rowKey={(row) => row.id}
    />
  );
}
