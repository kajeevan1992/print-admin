import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { ProductSectionCard } from './product-section-card';
import type { Product } from '@/modules/products/types';

export function PrintEditorForm({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  return (
    <div className="space-y-4">
      <FormSection title="Template Defaults">
        <FormGrid>
          <Input value={String(product.templateDefaults.scaleFactor)} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, scaleFactor: Number(e.target.value) || 1 } })} placeholder="Scale Factor" />
          <Input value={product.templateDefaults.zoomState} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, zoomState: e.target.value as Product['templateDefaults']['zoomState'] } })} placeholder="Zoom State" />
          <Input value={product.templateDefaults.palette} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, palette: e.target.value } })} placeholder="Palette" />
          <Input value={product.templateDefaults.colorSpace} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, colorSpace: e.target.value as Product['templateDefaults']['colorSpace'] } })} placeholder="Color Space" />
          <Input value={product.templateDefaults.editorMode} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, editorMode: e.target.value as Product['templateDefaults']['editorMode'] } })} placeholder="Editor Mode" />
          <Input value={product.templateDefaults.textModes.join(', ')} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, textModes: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Text Modes" />
          <Input value={product.templateDefaults.imageMode} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, imageMode: e.target.value as Product['templateDefaults']['imageMode'] } })} placeholder="Image Mode" />
          <Input value={product.templateDefaults.previewType} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, previewType: e.target.value } })} placeholder="Preview Type" />
          <Input value={product.templateDefaults.photoGroup} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, photoGroup: e.target.value } })} placeholder="Photo Group" />
          <Input value={product.templateDefaults.model3d} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, model3d: e.target.value } })} placeholder="3D Model" />
          <Input value={product.templateDefaults.defaultFont} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, defaultFont: e.target.value } })} placeholder="Default Font" />
          <Input value={product.templateDefaults.rules.join(', ')} onChange={(e) => onUpdate({ templateDefaults: { ...product.templateDefaults, rules: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Rules" />
        </FormGrid>
      </FormSection>

      <FormSection title="Template Setup">
        <FormGrid>
          <Input value={product.templateSetup.setupProfile} onChange={(e) => onUpdate({ templateSetup: { ...product.templateSetup, setupProfile: e.target.value } })} placeholder="Setup profile" />
          <Input value={String(product.templateSetup.allowUpload)} onChange={(e) => onUpdate({ templateSetup: { ...product.templateSetup, allowUpload: e.target.value === 'true' } })} placeholder="Allow upload" />
          <Input value={String(product.templateSetup.allowLayers)} onChange={(e) => onUpdate({ templateSetup: { ...product.templateSetup, allowLayers: e.target.value === 'true' } })} placeholder="Allow layers" />
          <Input value={String(product.templateSetup.smartSnapping)} onChange={(e) => onUpdate({ templateSetup: { ...product.templateSetup, smartSnapping: e.target.value === 'true' } })} placeholder="Smart snapping" />
        </FormGrid>
      </FormSection>

      <ProductSectionCard title="Template Assets">
        <FormGrid>
          <Input value={product.templateAssets.fonts.join(', ')} onChange={(e) => onUpdate({ templateAssets: { ...product.templateAssets, fonts: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Fonts" />
          <Input value={product.templateAssets.layouts.join(', ')} onChange={(e) => onUpdate({ templateAssets: { ...product.templateAssets, layouts: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Layouts" />
          <Input value={product.templateAssets.themes.join(', ')} onChange={(e) => onUpdate({ templateAssets: { ...product.templateAssets, themes: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Themes" />
          <Input value={product.templateAssets.cliparts.join(', ')} onChange={(e) => onUpdate({ templateAssets: { ...product.templateAssets, cliparts: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="Cliparts" />
        </FormGrid>
      </ProductSectionCard>
    </div>
  );
}
