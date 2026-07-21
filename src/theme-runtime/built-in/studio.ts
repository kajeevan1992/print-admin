import { renderStudioStorefront } from '@/theme-runtime/studio-renderer';
import { CORE_HOMEPAGE_SECTION_TYPES } from '@/theme-runtime/built-in/homepage-section-library';
import type { StorefrontThemeDefinition } from '@/theme-runtime/types';

export const STUDIO_THEME_DEFINITION: StorefrontThemeDefinition = {
  manifest: {
    key: 'studio-native',
    aliases: ['studio'],
    name: 'Studio',
    version: '1.3.0',
    source: 'built-in',
    description: 'Editorial storefront with a bold dark hero and studio-style product presentation, powered by the same internal SaaS services.',
    editor: {
      content: [
        { path: 'brand.brandName', label: 'Store name', type: 'text', group: 'Brand' },
        { path: 'brand.logoUrl', label: 'Logo', type: 'image', group: 'Brand' },
        { path: 'content.text.utilityText', label: 'Announcement bar text', type: 'text', group: 'Header' },
        { path: 'content.utilityItems', label: 'Announcement highlights', type: 'textarea', group: 'Header', description: 'One highlight per line, such as Fast turnaround or Bulk pricing.' },
        { path: 'navigation', label: 'Header and footer navigation', type: 'navigation', group: 'Navigation', description: 'Manage top-level header links, dropdown columns and footer navigation in the same storefront draft.', maxItems: 60 },
        { path: 'content.text.newsletterText', label: 'Newsletter strip text', type: 'text', group: 'Footer' },
        { path: 'content.newsletterAction', label: 'Newsletter form action URL', type: 'text', group: 'Footer', description: 'Optional form endpoint. Leave blank to show the message without an email form.' },
        { path: 'content.text.footerDescription', label: 'Footer description', type: 'textarea', group: 'Footer' },
        { path: 'content.footerStats', label: 'Footer statistics', type: 'textarea', group: 'Footer', description: 'One line per statistic using Label | Value, for example Business printing | 20+.' },
        { path: 'content.text.copyright', label: 'Copyright text', type: 'text', group: 'Footer' },
        { path: 'content.seoDescription', label: 'SEO description', type: 'textarea', group: 'SEO' },
        { path: 'content.socialImage', label: 'Social sharing image', type: 'image', group: 'SEO' },
        { path: 'sections', label: 'Homepage sections', type: 'sections', group: 'Homepage', description: 'Add, edit, reorder, duplicate, hide and remove homepage blocks. Drafts remain private until published.', sectionTypes: CORE_HOMEPAGE_SECTION_TYPES, maxItems: 30 },
        { path: 'content.pages', label: 'Storefront content pages', type: 'sections', group: 'Pages', description: 'Build About, Contact, service and campaign pages with the same approved blocks and publishing workflow.', sectionTypes: CORE_HOMEPAGE_SECTION_TYPES, maxItems: 24, pageCollection: true },
      ],
      settings: [
        { path: 'brand.primary', label: 'Primary colour', type: 'colour', group: 'Colours' },
        { path: 'brand.accent', label: 'Accent colour', type: 'colour', group: 'Colours' },
        { path: 'brand.background', label: 'Background colour', type: 'colour', group: 'Colours' },
        { path: 'brand.text', label: 'Text colour', type: 'colour', group: 'Colours' },
        { path: 'layout.showUtilityBar', label: 'Show announcement bar', type: 'boolean', group: 'Header' },
        { path: 'layout.showSearch', label: 'Show search', type: 'boolean', group: 'Header' },
        { path: 'layout.showCollectionPoints', label: 'Show collection selector', type: 'boolean', group: 'Header' },
        { path: 'layout.showCustomerAccount', label: 'Show customer account', type: 'boolean', group: 'Header' },
        { path: 'layout.showFooter', label: 'Show footer', type: 'boolean', group: 'Footer' },
        { path: 'layout.showNewsletter', label: 'Show newsletter strip', type: 'boolean', group: 'Footer' },
        { path: 'layout.showFooterStats', label: 'Show footer statistics', type: 'boolean', group: 'Footer' },
      ],
    },
  },
  renderer: renderStudioStorefront,
};
