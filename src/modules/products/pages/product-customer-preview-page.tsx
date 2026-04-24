'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { productsService } from '@/services/products.service';
import { calculateProductEstimate, getArtworkProfile, getCompatibleFinishes, getCompatibleMaterials, getTemplateById } from '@/lib/product-system';
import type { Product } from '@/modules/products/types';

export function ProductCustomerPreviewPage({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    productsService.getProduct(productId)
      .then((response) => setProduct(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product preview'))
      .finally(() => setLoading(false));
  }, [productId]);

  const previewData = useMemo(() => {
    if (!product) return null;
    const system = product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard' as const, fieldValues: {} };
    const template = getTemplateById(system.templateId);
    const materials = getCompatibleMaterials(system.templateId);
    const material = materials.find((item) => item.id === system.materialId) ?? materials[0];
    const finishes = getCompatibleFinishes(system.templateId, material?.id ?? system.materialId);
    const finish = finishes.find((item) => item.id === system.finishId) ?? finishes[0];
    const estimate = calculateProductEstimate(system.quantity, material?.id ?? system.materialId, finish?.id ?? system.finishId, system.printerId, system.turnaround, system.fieldValues);
    const artwork = getArtworkProfile(system.templateId);
    return { system, template, material, finish, estimate, artwork };
  }, [product]);

  if (loading) return <ProductSectionCard title="Loading preview">Loading customer-facing product preview...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Preview error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product || !previewData) return <ProductSectionCard title="Preview unavailable">Product not found.</ProductSectionCard>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
        Customer preview mode. This is not the editable admin screen. It shows the current product as a buyer would start to see it.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
            {product.thumbnail ? <img src={product.thumbnail} alt={product.name} className="max-h-[320px] rounded-2xl object-contain" /> : <span className="text-textMuted">Product artwork preview</span>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-textMuted">{previewData.template.name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{product.name}</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">{product.description || 'Product description will appear here for the customer.'}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Material</p><p className="mt-1 font-medium text-white">{previewData.material?.name ?? 'Not configured'}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Finish</p><p className="mt-1 font-medium text-white">{previewData.finish?.name ?? 'Not configured'}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Quantity</p><p className="mt-1 font-medium text-white">{previewData.system.quantity}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Turnaround</p><p className="mt-1 font-medium text-white">{previewData.system.turnaround}</p></div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/75">Estimated price</p>
            <p className="mt-2 text-3xl font-semibold text-white">£{previewData.estimate.total}</p>
            <p className="mt-1 text-sm text-emerald-100/75">{previewData.estimate.tierLabel} · {previewData.estimate.turnaroundDays} day lead</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button>Upload artwork</Button>
            <Button>Start from template</Button>
            <Button>Add to basket</Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-panel p-5">
        <p className="text-sm font-medium text-white">Artwork checks shown to customer</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {previewData.artwork.checklist.map((item) => <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{item}</div>)}
        </div>
      </div>
    </div>
  );
}
