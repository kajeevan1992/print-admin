import type { V0ThemePackageManifest } from '../contracts';

export const CANVAS_V0_MANIFEST = {
  key: 'canvas-native',
  aliases: ['canvas'],
  name: 'Canvas',
  version: '1.0.0',
  description: 'A clean, spacious storefront created through the restricted v0 presentation contract.',
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
      { path: 'layout.showSearch', label: 'Show search', type: 'boolean', group: 'Header' },
      { path: 'layout.showCollectionPoints', label: 'Show collection selector', type: 'boolean', group: 'Header' },
      { path: 'layout.showCustomerAccount', label: 'Show customer account', type: 'boolean', group: 'Header' },
    ],
  },
} satisfies V0ThemePackageManifest;
