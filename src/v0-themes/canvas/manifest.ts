import type { V0ThemePackageManifest } from '../contracts';

const surfaceOptions = [{ label: 'Card', value: 'card' }, { label: 'Soft', value: 'soft' }, { label: 'Flat', value: 'flat' }];
const densityOptions = [{ label: 'Compact', value: 'compact' }, { label: 'Comfortable', value: 'comfortable' }, { label: 'Spacious', value: 'spacious' }];
const radiusOptions = [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }];
const optionOptions = [{ label: 'Cards', value: 'cards' }, { label: 'Pills', value: 'pills' }, { label: 'Segments', value: 'segments' }];
const fieldOptions = [{ label: 'Outline', value: 'outline' }, { label: 'Filled', value: 'filled' }, { label: 'Underline', value: 'underline' }];
const buttonOptions = [{ label: 'Pill', value: 'pill' }, { label: 'Rounded', value: 'rounded' }, { label: 'Square', value: 'square' }];
const priceOptions = [{ label: 'Panel', value: 'panel' }, { label: 'Highlight', value: 'highlight' }, { label: 'Minimal', value: 'minimal' }];
const shadowOptions = [{ label: 'None', value: 'none' }, { label: 'Soft', value: 'soft' }, { label: 'Strong', value: 'strong' }];
const labelOptions = [{ label: 'Normal', value: 'normal' }, { label: 'Uppercase', value: 'uppercase' }];

export const CANVAS_V0_MANIFEST = {
  key: 'canvas-native',
  aliases: ['canvas'],
  name: 'Canvas',
  version: '1.1.0',
  description: 'A clean, spacious storefront created through the restricted v0 presentation contract.',
  widgetAppearance: {
    surface: 'card',
    density: 'comfortable',
    radius: 'large',
    optionStyle: 'cards',
    fieldStyle: 'filled',
    buttonStyle: 'pill',
    priceStyle: 'highlight',
    shadow: 'soft',
    labelStyle: 'uppercase',
  },
  editor: {
    content: [
      { path: 'brand.brandName', label: 'Store name', type: 'text', group: 'Brand' },
      { path: 'brand.logoUrl', label: 'Logo', type: 'image', group: 'Brand' },
      { path: 'content.text.utilityText', label: 'Announcement text', type: 'text', group: 'Header' },
      { path: 'content.text.footerDescription', label: 'Footer description', type: 'textarea', group: 'Footer' },
      { path: 'content.seoDescription', label: 'SEO description', type: 'textarea', group: 'SEO' },
      { path: 'content.socialImage', label: 'Social sharing image', type: 'image', group: 'SEO' },
      { path: 'sections', label: 'Homepage sections', type: 'sections', group: 'Homepage' },
    ],
    settings: [
      { path: 'brand.primary', label: 'Primary colour', type: 'colour', group: 'Colours' },
      { path: 'brand.accent', label: 'Accent colour', type: 'colour', group: 'Colours' },
      { path: 'brand.background', label: 'Background colour', type: 'colour', group: 'Colours' },
      { path: 'brand.text', label: 'Text colour', type: 'colour', group: 'Colours' },
      { path: 'layout.cardRadius', label: 'Card radius', type: 'select', group: 'Layout', options: [
        { label: 'Medium', value: '' },
        { label: 'Small', value: 'small' },
        { label: 'Large', value: 'large' },
      ] },
      { path: 'layout.widgetAppearance.surface', label: 'Widget surface', type: 'select', group: 'Configurator', options: surfaceOptions },
      { path: 'layout.widgetAppearance.density', label: 'Widget spacing', type: 'select', group: 'Configurator', options: densityOptions },
      { path: 'layout.widgetAppearance.radius', label: 'Widget corner radius', type: 'select', group: 'Configurator', options: radiusOptions },
      { path: 'layout.widgetAppearance.optionStyle', label: 'Option control style', type: 'select', group: 'Configurator', options: optionOptions },
      { path: 'layout.widgetAppearance.fieldStyle', label: 'Form field style', type: 'select', group: 'Configurator', options: fieldOptions },
      { path: 'layout.widgetAppearance.buttonStyle', label: 'Primary button shape', type: 'select', group: 'Configurator', options: buttonOptions },
      { path: 'layout.widgetAppearance.priceStyle', label: 'Price presentation', type: 'select', group: 'Configurator', options: priceOptions },
      { path: 'layout.widgetAppearance.shadow', label: 'Widget shadow', type: 'select', group: 'Configurator', options: shadowOptions },
      { path: 'layout.widgetAppearance.labelStyle', label: 'Widget labels', type: 'select', group: 'Configurator', options: labelOptions },
      { path: 'layout.showSearch', label: 'Show search', type: 'boolean', group: 'Header' },
      { path: 'layout.showCollectionPoints', label: 'Show collection selector', type: 'boolean', group: 'Header' },
      { path: 'layout.showCustomerAccount', label: 'Show customer account', type: 'boolean', group: 'Header' },
    ],
  },
} satisfies V0ThemePackageManifest;
