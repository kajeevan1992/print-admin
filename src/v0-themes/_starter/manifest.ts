import type { V0ThemePackageManifest } from '../contracts';

export const __THEME_NAME_UPPER___V0_MANIFEST = {
  key: '__THEME_SLUG__-native',
  aliases: ['__THEME_SLUG__'],
  name: '__THEME_NAME__',
  version: '1.0.0',
  description: '__THEME_NAME__ storefront created through the restricted v0 presentation contract.',
  editor: {
    content: [
      { path: 'brand.brandName', label: 'Store name', type: 'text', group: 'Brand' },
      { path: 'brand.logoUrl', label: 'Logo', type: 'image', group: 'Brand' },
      { path: 'content.text.utilityText', label: 'Announcement text', type: 'text', group: 'Header' },
      { path: 'content.text.footerDescription', label: 'Footer description', type: 'textarea', group: 'Footer' },
      { path: 'sections', label: 'Homepage sections', type: 'sections', group: 'Homepage' },
    ],
    settings: [
      { path: 'brand.primary', label: 'Primary colour', type: 'colour', group: 'Colours' },
      { path: 'brand.accent', label: 'Accent colour', type: 'colour', group: 'Colours' },
      { path: 'brand.background', label: 'Background colour', type: 'colour', group: 'Colours' },
      { path: 'brand.text', label: 'Text colour', type: 'colour', group: 'Colours' },
      { path: 'layout.showSearch', label: 'Show search', type: 'boolean', group: 'Header' },
      { path: 'layout.showCollectionPoints', label: 'Show collection selector', type: 'boolean', group: 'Header' },
      { path: 'layout.showCustomerAccount', label: 'Show customer account', type: 'boolean', group: 'Header' },
    ],
  },
} satisfies V0ThemePackageManifest;
