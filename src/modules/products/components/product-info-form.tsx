import { useEffect, useState } from 'react';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { productCategories, productVendors } from '@/data/products';
import { channelsService } from '@/services/channels.service';
import type { Product } from '@/modules/products/types';

const templateOptions = ['marketing', 'catalog', 'packaging'];

export function ProductInfoForm({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const [channelOptions, setChannelOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    channelsService.listChannels().then((res) => setChannelOptions(res.data.items.map((channel) => ({ id: channel.id, name: channel.name }))));
  }, []);

  return (
    <div className="space-y-4">
      <FormSection title="Basic Information">
        <FormGrid>
          <Input value={product.slug} onChange={(e) => onUpdate({ slug: e.target.value })} placeholder="Slug" />
          <Input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Name" />
        </FormGrid>
        <textarea value={product.description} onChange={(e) => onUpdate({ description: e.target.value })} className="mt-3 w-full rounded-lg border border-border bg-panelMuted p-3 text-sm" rows={3} placeholder="Description" />
      </FormSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection title="Classification">
          <FormGrid>
            <Select value={product.productType} options={['templated', 'blank', 'hybrid']} onChange={(e) => onUpdate({ productType: e.target.value as Product['productType'] })} />
            <Select value={product.categoryId} options={productCategories.map((category) => category.id)} onChange={(e) => onUpdate({ categoryId: e.target.value })} />
            <Select value={product.vendorId} options={productVendors.map((vendor) => vendor.id)} onChange={(e) => onUpdate({ vendorId: e.target.value })} />
          </FormGrid>
        </FormSection>

        <FormSection title="Visibility & Channel Availability">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">Global Product <Toggle checked={product.isGlobal} onChange={(value) => onUpdate({ isGlobal: value })} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">Published <Toggle checked={product.published} onChange={(value) => onUpdate({ published: value })} /></div>
            {!product.isGlobal ? (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs uppercase text-textMuted">Select channels</p>
                <div className="space-y-2 text-sm">
                  {channelOptions.map((channel) => {
                    const checked = product.channelIds?.includes(channel.id) ?? false;
                    return (
                      <label key={channel.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(product.channelIds ?? []);
                            if (e.target.checked) next.add(channel.id); else next.delete(channel.id);
                            onUpdate({ channelIds: Array.from(next) });
                          }}
                        />
                        {channel.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </FormSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection title="Price Mapping">
          <FormGrid>
            <Input value={String(product.priceMapping.basePrice)} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, basePrice: Number(e.target.value) || 0 } })} placeholder="Base Price" />
            <Input value={product.priceMapping.sizeLabel} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, sizeLabel: e.target.value } })} placeholder="Size" />
            <Input value={product.thumbnail} onChange={(e) => onUpdate({ thumbnail: e.target.value })} placeholder="Thumbnail" />
          </FormGrid>
        </FormSection>

        <FormSection title="Product Numbers">
          <FormGrid>
            <Input value={product.productNumbers.itemNumber} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, itemNumber: e.target.value } })} placeholder="Item Number" />
            <Input value={product.productNumbers.modelNumber} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, modelNumber: e.target.value } })} placeholder="Model Number" />
            <Input value={product.productNumbers.integrationId} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, integrationId: e.target.value } })} placeholder="Integration ID" />
          </FormGrid>
        </FormSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection title="Template Defaults">
          <FormGrid>
            <Input value={String(product.templateDefaults.scaleFactor)} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, scaleFactor: Number(e.target.value) || 1 } })} placeholder="Scale Factor" />
            <Select value={product.templateDefaults.zoomState} options={['fit', 'fill', 'custom']} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, zoomState: e.target.value as Product['templateDefaults']['zoomState'] } })} />
            <Select value={product.templateDefaults.editorMode} options={['simple', 'advanced']} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, editorMode: e.target.value as Product['templateDefaults']['editorMode'] } })} />
            <Select value={product.templateDefaults.trimMode} options={['safe', 'full-bleed']} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, trimMode: e.target.value as Product['templateDefaults']['trimMode'] } })} />
            <Input value={String(product.templateDefaults.rotate)} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, rotate: Number(e.target.value) || 0 } })} placeholder="Rotate" />
            <Select value={product.templateDefaults.imageMode} options={['cover', 'contain']} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, imageMode: e.target.value as Product['templateDefaults']['imageMode'] } })} />
            <Select value={product.templateDefaults.colorSpace} options={['CMYK', 'RGB']} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, colorSpace: e.target.value as Product['templateDefaults']['colorSpace'] } })} />
            <Select value={product.templateDefaults.templateType} options={templateOptions} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, templateType: e.target.value as Product['templateDefaults']['templateType'] } })} />
          </FormGrid>
        </FormSection>

        <FormSection title="Template Setup">
          <div className="space-y-2 text-sm">
            {Object.entries(product.templateSetup).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <Toggle checked={value} onChange={(next) => onUpdate({ templateSetup: { ...product.templateSetup, [key]: next } })} />
              </div>
            ))}
          </div>
        </FormSection>
      </div>
    </div>
  );
}
