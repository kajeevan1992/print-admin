import { renderAtlantisStorefront } from '@/theme-runtime/atlantis-renderer';
import type { StorefrontThemeDefinition } from '@/theme-runtime/types';

export const ATLANTIS_THEME_DEFINITION: StorefrontThemeDefinition = {
  manifest: {
    key: 'atlantis-native',
    aliases: ['atlantis-print-hosted'],
    name: 'Atlantis',
    version: '1.0.0',
    source: 'built-in',
    description: 'Internal Atlantis storefront using direct SaaS catalogue, pricing, VAT, basket and checkout services.',
    editor: {
      content: [
        { path: 'brand.brandName', label: 'Store name', type: 'text', group: 'Brand' },
        { path: 'brand.logoUrl', label: 'Logo', type: 'image', group: 'Brand' },
        { path: 'content.text.utilityText', label: 'Announcement bar text', type: 'text', group: 'Header' },
        { path: 'content.seoDescription', label: 'SEO description', type: 'textarea', group: 'SEO' },
        { path: 'content.socialImage', label: 'Social sharing image', type: 'image', group: 'SEO' },
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
  },
  renderer: renderAtlantisStorefront,
};
