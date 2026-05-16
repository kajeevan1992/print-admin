'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductHeader } from '@/modules/products/components/product-header';
import { ProductTabs } from '@/modules/products/components/product-tabs';
import { ProductInfoForm } from '@/modules/products/components/product-info-form';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { CommentsPanel } from '@/modules/products/components/comments-panel';
import { PrintEditorForm } from '@/modules/products/components/print-editor-form';
import { ProductRightSidebar } from '@/modules/products/components/product-right-sidebar';
import { ProductOptionGroupsBuilder } from '@/modules/products/components/product-option-groups-builder';
import { ProductTemplateRulesBuilder } from '@/modules/products/components/product-template-rules-builder';
import { ProductModeSettingsBuilder } from '@/modules/products/components/product-mode-settings-builder';
import { productsService } from '@/services/products.service';
import { categoriesService } from '@/services/categories.service';
import { calculateProductEstimate, getArtworkProfile, getCompatibleFinishes, getCompatibleMaterials, getCompatiblePrinters, getRuleWarnings } from '@/lib/product-system';
import type { Product } from '@/modules/products/types';
import type { SelectOption } from '@/components/forms/select';

const defaultTab = 'Product Information';

export function ProductDetailPage({ productId }: { productId: string }) {
  const [active, setActive] = useState(defaultTab);
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangesRef = useRef<Partial<Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedInput, setRelatedInput] = useState('');
  const [attributeType, setAttributeType] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [alternateLabel, setAlternateLabel] = useState('');
  const [alternateUrl, setAlternateUrl] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([productsService.getProduct(productId), productsService.listProducts({ perPage: 200 }), categoriesService.listCategories()])
      .then(([productResponse, allProductsResponse, categoriesResponse]) => {
        setProduct(productResponse.data);
        setAllProducts(allProductsResponse.data.items);
        setCategoryOptions(categoriesResponse.data.items.map((item) => ({ value: item.id, label: item.name })));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistProduct = (changes: Partial<Product>) => {
    if (!product) return;
    const productIdToSave = product.id;
    pendingChangesRef.current = { ...pendingChangesRef.current, ...changes };
    setProduct((current) => current ? { ...current, ...changes } : current);
    setError(null);
    setNotice(null);
    setSaveState('saving');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const payload = pendingChangesRef.current;
      pendingChangesRef.current = {};
      try {
        const response = await productsService.updateProduct(productIdToSave, payload);
        setProduct(response.data);
        setSaveState('saved');
        setNotice('Saved');
      } catch (err) {
        pendingChangesRef.current = { ...payload, ...pendingChangesRef.current };
        setSaveState('error');
        setError(err instanceof Error ? err.message : 'Failed to save product');
      }
    }, 650);
  };

  const relatedCandidates = useMemo(
    () => allProducts.filter((item) => item.id !== product?.id && !product?.relatedProducts.some((related) => related.id === item.id)),
    [allProducts, product]
  );

  if (loading) return <ProductSectionCard title="Loading">Loading product data...</ProductSectionCard>;
  if (error && !product) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product) return <EmptyModuleState title="Product not found" description="This product may have been removed." />;

  return (
    <div>
      <ProductHeader product={product} onSave={() => persistProduct({})} onCancel={() => setActive(defaultTab)} />
      <div className="mb-4 min-h-[44px]">
        <div className={`rounded-xl border p-3 text-sm transition ${saveState === 'error' || error ? 'border-red-500/40 bg-red-500/10 text-red-200' : saveState === 'saving' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : saveState === 'saved' || notice ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-transparent bg-transparent text-textMuted'}`}>
          {error || (saveState === 'saving' ? 'Saving changes…' : saveState === 'saved' || notice ? 'Saved' : 'Edit fields below. Changes autosave after you pause typing.')}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <ProductTabs active={active} onChange={setActive} />

          {active === 'Product Information' && (<div className="space-y-4">
            <ProductInfoForm product={product} onUpdate={persistProduct} categoryOptions={categoryOptions} />
            <ProductSectionCard title="Product System">
              {(() => {
                const system = product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} };
                const materials = getCompatibleMaterials(system.templateId);
                const material = materials.find((item) => item.id === system.materialId) ?? materials[0];
                const finishes = getCompatibleFinishes(system.templateId, material?.id ?? system.materialId);
                const printers = getCompatiblePrinters(system.templateId, material?.id ?? system.materialId, system.fieldValues);
                const estimate = calculateProductEstimate(system.quantity, material?.id ?? system.materialId, system.finishId, system.printerId, system.turnaround, system.fieldValues);
                const artwork = getArtworkProfile(system.templateId);
                const warnings = getRuleWarnings(system.templateId, system.fieldValues);
                const updateSystem = (changes: Partial<typeof system>) => {
                  void persistProduct({ productSystem: { ...system, ...changes } });
                };
                return (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2"><span className="text-sm font-medium">Template</span><select value={system.templateId} onChange={(e) => updateSystem({ templateId: e.target.value })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm"><option value="business-cards">Business Cards</option><option value="flyers">Flyers & Leaflets</option><option value="booklets">Booklets</option></select></label>
                      <label className="space-y-2"><span className="text-sm font-medium">Material</span><select value={material?.id ?? ''} onChange={(e) => updateSystem({ materialId: e.target.value })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">{materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label className="space-y-2"><span className="text-sm font-medium">Finish</span><select value={system.finishId} onChange={(e) => updateSystem({ finishId: e.target.value })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">{finishes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label className="space-y-2"><span className="text-sm font-medium">Printer</span><select value={system.printerId} onChange={(e) => updateSystem({ printerId: e.target.value })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">{printers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label className="space-y-2"><span className="text-sm font-medium">Quantity</span><Input type="number" value={String(system.quantity)} onChange={(e) => updateSystem({ quantity: Number(e.target.value) || 0 })} /></label>
                      <label className="space-y-2"><span className="text-sm font-medium">Turnaround</span><select value={system.turnaround} onChange={(e) => updateSystem({ turnaround: e.target.value as typeof system.turnaround })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm"><option value="standard">Standard</option><option value="priority">Priority</option><option value="rush">Rush</option></select></label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border p-4"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">Artwork profile</p><p className="mt-2 font-medium text-white">{artwork.name}</p><ul className="mt-2 space-y-1 text-sm text-textMuted">{artwork.checklist.map((item) => <li key={item}>• {item}</li>)}</ul></div>
                      <div className="rounded-lg border border-border p-4"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">Live estimate</p><p className="mt-2 text-2xl font-semibold text-white">£{estimate.total}</p><p className="mt-1 text-sm text-textMuted">{estimate.tierLabel} · {estimate.turnaroundDays} day lead</p><div className="mt-3 space-y-1 text-sm text-textMuted">{warnings.length ? warnings.map((item) => <div key={item}>• {item}</div>) : <div>No product-rule warnings.</div>}</div></div>
                    </div>
                  </div>
                );
              })()}
            </ProductSectionCard>
          </div>)}

          {active === 'Option Groups' && <ProductOptionGroupsBuilder product={product} onUpdate={persistProduct} />}
          {active === 'Templates & Rules' && <ProductTemplateRulesBuilder product={product} onUpdate={persistProduct} />}
          {active === 'Product Modes' && <ProductModeSettingsBuilder product={product} onUpdate={persistProduct} />}

          {active === 'Print Editor' && <PrintEditorForm product={product} onUpdate={persistProduct} />}

          {active === 'Attributes' && (
            <ProductSectionCard title="Attributes">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Attribute type" value={attributeType} onChange={(e) => setAttributeType(e.target.value)} />
                <Input placeholder="Value" value={attributeValue} onChange={(e) => setAttributeValue(e.target.value)} />
                <Button
                  onClick={() => {
                    if (!attributeType.trim() || !attributeValue.trim()) return;
                    void persistProduct({ attributes: [ ...product.attributes, { id: `attr-${Date.now()}`, type: attributeType.trim(), value: attributeValue.trim() } ] });
                    setAttributeType('');
                    setAttributeValue('');
                  }}
                >Add Attribute</Button>
              </div>
              <div className="space-y-2">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input value={attribute.type} onChange={(e) => persistProduct({ attributes: product.attributes.map((item) => item.id === attribute.id ? { ...item, type: e.target.value } : item) })} />
                    <Input value={attribute.value} onChange={(e) => persistProduct({ attributes: product.attributes.map((item) => item.id === attribute.id ? { ...item, value: e.target.value } : item) })} />
                    <Button className="text-red-300" onClick={() => persistProduct({ attributes: product.attributes.filter((item) => item.id !== attribute.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Related Products' && (
            <ProductSectionCard title="Related Products">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <select value={relatedInput} onChange={(e) => setRelatedInput(e.target.value)} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                  <option value="">Select related product</option>
                  {relatedCandidates.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <Button onClick={() => {
                  const related = relatedCandidates.find((item) => item.id === relatedInput);
                  if (!related) return;
                  void persistProduct({ relatedProducts: [ ...product.relatedProducts, { id: related.id, name: related.name, slug: related.slug, thumbnail: related.thumbnail } ] });
                  setRelatedInput('');
                }}>Add</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.relatedProducts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <img src={item.thumbnail} alt={item.name} className="mb-2 h-20 w-full rounded border border-border object-cover" />
                    <p className="font-medium">{item.name}</p>
                    <Button className="mt-2 w-full text-red-300" onClick={() => persistProduct({ relatedProducts: product.relatedProducts.filter((related) => related.id !== item.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Alternate View' && (
            <ProductSectionCard title="Alternate View">
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Label" value={alternateLabel} onChange={(e) => setAlternateLabel(e.target.value)} />
                <Input placeholder="Image URL" value={alternateUrl} onChange={(e) => setAlternateUrl(e.target.value)} />
                <Button onClick={() => {
                  if (!alternateLabel.trim() || !alternateUrl.trim()) return;
                  void persistProduct({ alternateViews: [ ...product.alternateViews, { id: `alt-${Date.now()}`, label: alternateLabel.trim(), url: alternateUrl.trim() } ] });
                  setAlternateLabel('');
                  setAlternateUrl('');
                }}>Add View</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.alternateViews.map((view) => (
                  <div key={view.id} className="rounded-lg border border-border p-3">
                    <img src={view.url} alt={view.label} className="mb-2 h-24 w-full rounded object-cover" />
                    <p className="text-sm">{view.label}</p>
                    <Button className="mt-2 w-full text-red-300" onClick={() => persistProduct({ alternateViews: product.alternateViews.filter((item) => item.id !== view.id) })}>Delete</Button>
                  </div>
                ))}
              </div>
            </ProductSectionCard>
          )}

          {active === 'Comments' && (
            <CommentsPanel
              comments={product.comments}
              onAdd={(message) => {
                void persistProduct({ comments: [ ...product.comments, { id: `comment-${Date.now()}`, author: 'Admin User', timestamp: new Date().toLocaleString(), label: 'internal', message } ] });
              }}
            />
          )}
        </div>

        <ProductRightSidebar product={product} onUpdate={persistProduct} />
      </div>
    </div>
  );
}
