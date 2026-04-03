import Link from 'next/link';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { Product } from '@/modules/products/types';
import { ProductMetaBadges } from './product-meta-badges';

export function ProductHeader({ product, onSave }: { product: Product; onSave: () => void }) {
  return (
    <div className="mb-4 space-y-3">
      <Link href="/products" className="text-sm text-accent">← Back to Products</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-textMuted">/{product.slug} · Updated {product.updatedAt}</p>
          <ProductMetaBadges product={product} />
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={onSave}>Save Product</PrimaryButton>
          <Button>Preview</Button>
          <Button>Duplicate</Button>
          <Button className="text-red-300">Archive</Button>
        </div>
      </div>
    </div>
  );
}
