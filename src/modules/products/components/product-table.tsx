import Link from 'next/link';
import { DataTable } from '@/components/data-table/data-table';
import { Toggle } from '@/components/forms/toggle';
import type { Product } from '@/modules/products/types';

export function ProductTable({
  products,
  selected,
  onSelect,
  onToggle
}: {
  products: Product[];
  selected: string[];
  onSelect: (id: string, checked: boolean) => void;
  onToggle: (id: string, key: 'published' | 'isGlobal', value: boolean) => void;
}) {
  return (
    <DataTable
      columns={[
        { key: 'check', header: '', render: (row) => <input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => onSelect(row.id, e.target.checked)} /> },
        { key: 'name', header: 'Product', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-textMuted">/{row.slug}</p></div> },
        { key: 'type', header: 'Type', render: (row) => row.productType },
        { key: 'size', header: 'Size', render: (row) => `${row.width} x ${row.height} ${row.units}` },
        { key: 'price', header: 'Base Price', render: (row) => `$${row.priceMapping.basePrice.toFixed(2)}` },
        { key: 'published', header: 'Published', render: (row) => <Toggle checked={row.published} onChange={(next) => onToggle(row.id, 'published', next)} /> },
        { key: 'global', header: 'Global', render: (row) => <Toggle checked={row.isGlobal} onChange={(next) => onToggle(row.id, 'isGlobal', next)} /> },
        { key: 'status', header: 'Status', render: (row) => row.status },
        { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Link className="text-accent" href={`/products/${row.id}`}>Open</Link><button className="text-textMuted">More</button></div> }
      ]}
      rows={products}
      rowKey={(row) => row.id}
    />
  );
}
