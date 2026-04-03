import Link from 'next/link';
import { Toggle } from '@/components/forms/toggle';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/buttons';
import type { Product } from '@/modules/products/types';

export type ProductTableAction = 'edit' | 'edit-window' | 'clone' | 'preview' | 'delete';

export function ProductTable({
  products,
  onToggle,
  onAction
}: {
  products: Product[];
  onToggle: (id: string, key: 'published' | 'isGlobal', value: boolean) => void;
  onAction: (id: string, action: ProductTableAction) => void;
}) {
  return (
    <DataTable
      columns={[
        { key: 'id', header: 'Id', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
        {
          key: 'preview',
          header: 'Preview',
          render: (row) => <img src={row.thumbnail} alt={row.name} className="h-10 w-10 rounded-md border border-border object-cover" />
        },
        { key: 'sort', header: 'Sort', render: (row) => row.sortOrder },
        {
          key: 'name',
          header: 'Name',
          render: (row) => (
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-textMuted">Item: {row.productNumbers.itemNumber || '—'}</p>
              <p className="text-xs text-textMuted">Model: {row.productNumbers.modelNumber || '—'}</p>
            </div>
          )
        },
        { key: 'comments', header: 'Comments', render: (row) => row.comments.length },
        { key: 'lastSaved', header: 'Last Saved', render: (row) => <span className="text-xs text-textMuted">{row.lastSavedAt}</span> },
        { key: 'published', header: 'Published', render: (row) => <Toggle checked={row.published} onChange={(next) => onToggle(row.id, 'published', next)} /> },
        { key: 'global', header: 'Global', render: (row) => <Toggle checked={row.isGlobal} onChange={(next) => onToggle(row.id, 'isGlobal', next)} /> },
        {
          key: 'actions',
          header: 'Action Menu',
          render: (row) => (
            <div className="flex flex-wrap gap-1">
              <Link href={`/products/${row.id}`} className="rounded border border-border px-2 py-1 text-xs">View/Edit</Link>
              <Button className="px-2 py-1 text-xs" onClick={() => onAction(row.id, 'edit-window')}>New Window</Button>
              <Button className="px-2 py-1 text-xs" onClick={() => onAction(row.id, 'clone')}>Clone</Button>
              <Button className="px-2 py-1 text-xs" onClick={() => onAction(row.id, 'preview')}>Preview</Button>
              <Button className="px-2 py-1 text-xs text-red-300" onClick={() => onAction(row.id, 'delete')}>Delete</Button>
            </div>
          )
        }
      ]}
      rows={products}
      rowKey={(row) => row.id}
    />
  );
}
