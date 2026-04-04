import Link from 'next/link';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { Product } from '@/modules/products/types';

export function ProductHeader({ product, onSave, onCancel }: { product: Product; onSave: () => void; onCancel: () => void }) {
  const missingDefaultFont = product.productType === 'online' && !product.templateDefaults.defaultFont;

  return (
    <div className="mb-4 space-y-3">
      <Link href="/products" className="text-sm text-accent">← Back to Products</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <div className="flex gap-2">
          <PrimaryButton onClick={onSave}>Save</PrimaryButton>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>
      {missingDefaultFont ? <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">Default font is not assigned for this online product.</div> : null}
    </div>
  );
}
