'use client';

import { useMemo, useState } from 'react';
import { products, productAttributes } from '@/data/mock-data';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { EmptyState } from '@/components/ui/empty-state';

const tabList = ['Product Information', 'Print Editor', 'Attributes', 'Related Products', 'Alternative View', 'Comments', 'Tags', 'Inventory'];

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState(tabList[0]);
  const product = useMemo(() => products.find((p) => p.id === productId) ?? products[0], [productId]);

  return (
    <div>
      <PageHeader title={product.name} subtitle={`SKU ${product.sku} · ${product.category} · Last updated ${product.updatedAt}`} actions={<PrimaryButton>Save Changes</PrimaryButton>} />
      <Tabs tabs={tabList} active={active} onChange={setActive} />

      {active === 'Product Information' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Basic Information</h3>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Product Type: Standard Print Product</p>
              <p>Category: {product.category}</p>
              <p>Vendor: {product.vendor}</p>
              <p>Path: /products/{product.id}</p>
              <p>Global Product: {product.global ? 'Enabled' : 'Disabled'}</p>
              <p>Published: {product.published ? 'Enabled' : 'Disabled'}</p>
              <p>Price Mapping: Tier A</p>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Template Setup</h3>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Thumbnail: Placeholder image</p>
              <p>Product Number: {product.sku}</p>
              <p>Default Front Template: Enabled</p>
              <p>Default Back Template: Enabled</p>
              <p>Allow Customer Artwork Upload: Enabled</p>
              <p>Auto Generate Proof: Disabled</p>
            </div>
          </Card>
        </div>
      )}

      {active === 'Print Editor' && (
        <Card>
          <p className="text-sm text-textMuted">Launch the full print editor to configure layers, bleed zones, and dynamic fields.</p>
          <PrimaryButton>Open Print Editor</PrimaryButton>
        </Card>
      )}

      {active === 'Attributes' && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Attribute List</h3>
            <Button>Add Attribute</Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-textMuted"><tr><th>Name</th><th>Type</th><th>Required</th></tr></thead>
            <tbody>
              {productAttributes.map((a) => (
                <tr key={a.id} className="border-t border-border"><td className="py-2">{a.name}</td><td>{a.type}</td><td>{a.required ? 'Yes' : 'No'}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {active === 'Related Products' && (
        <Card>
          <div className="mb-3 flex gap-2">
            <input placeholder="Search product to relate..." className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" />
            <Button>Add</Button>
          </div>
          <EmptyState title="No related products" description="Add complementary products to improve upsell opportunities." />
        </Card>
      )}

      {active === 'Alternative View' && (
        <Card>
          <EmptyState title="No alternative images yet" description="Upload alternate angle previews or material close-ups for this product." />
        </Card>
      )}

      {['Comments', 'Tags', 'Inventory'].includes(active) && (
        <Card>
          <EmptyState title={`${active} module ready`} description="This panel is prepared for future API-connected workflows." />
        </Card>
      )}
    </div>
  );
}
