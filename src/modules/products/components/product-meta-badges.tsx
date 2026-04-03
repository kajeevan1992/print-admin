import type { Product } from '@/modules/products/types';

export function ProductMetaBadges({ product }: { product: Product }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-border px-2 py-1">
        {(product.productType ?? 'standard').toUpperCase()}
      </span>
      <span className="rounded-full border border-border px-2 py-1">
        {(product.status ?? (product.published ? 'active' : 'draft')).toUpperCase()}
      </span>
      <span className="rounded-full border border-border px-2 py-1">
        {product.published ? 'Published' : 'Unpublished'}
      </span>
      <span className="rounded-full border border-border px-2 py-1">
        {product.global ? 'Global' : 'Local'}
      </span>
    </div>
  );
}
