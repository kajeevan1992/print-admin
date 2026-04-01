'use client';

import Link from 'next/link';
import { useState } from 'react';
import { products } from '@/data/mock-data';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { TableWrapper } from '@/components/ui/table-wrapper';
import { Modal } from '@/components/ui/modal';

export function ProductsListPage() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage print catalog items, global sync status, and publish controls."
        actions={
          <>
            <Button>Import</Button>
            <Button>Export</Button>
            <PrimaryButton>+ Add Product</PrimaryButton>
          </>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2">
        <input placeholder="Search product, SKU, category..." className="min-w-64 flex-1 rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" />
        <Button>Category</Button>
        <Button>Vendor</Button>
        <Button>Status</Button>
        <Button className="ml-auto" onClick={() => setOpen(true) as never}>Create Product</Button>
      </Card>

      <TableWrapper>
        <table className="w-full text-left text-sm">
          <thead className="text-textMuted">
            <tr>
              <th className="px-4 py-3">Name</th><th>Category</th><th>Vendor</th><th>Price</th><th>Published</th><th>Global</th><th>Updated</th><th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td>{p.category}</td>
                <td>{p.vendor}</td>
                <td>${p.price}</td>
                <td>{p.published ? 'On' : 'Off'}</td>
                <td>{p.global ? 'Global' : 'Local'}</td>
                <td>{p.updatedAt}</td>
                <td className="px-4 py-2"><Link className="text-accent" href={`/products/${p.id}`}>Preview</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      <div className="mt-4 flex justify-end gap-2">
        <Button>Previous</Button>
        <Button>1</Button>
        <Button>2</Button>
        <Button>Next</Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Product">
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="rounded-lg border border-border bg-panelMuted p-4 text-left">Use DMI Templated Product</button>
            <button className="rounded-lg border border-border bg-panelMuted p-4 text-left">Create Blank Product</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Product Name', 'Category', 'Pages', 'Units', 'Width', 'Height', 'Bleed'].map((f) => (
              <input key={f} placeholder={f} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button>Cancel</Button>
            <PrimaryButton>Create Product</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
