import type { StorefrontThemeSectionFieldSchema, StorefrontThemeSectionTypeSchema } from '@/theme-runtime/types';

const headingFields: StorefrontThemeSectionFieldSchema[] = [
  { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'A short label above the heading' },
  { key: 'title', label: 'Heading', type: 'text', placeholder: 'Section heading' },
  { key: 'body', label: 'Body text', type: 'textarea', placeholder: 'Supporting copy for this section' },
];

const primaryActionFields: StorefrontThemeSectionFieldSchema[] = [
  { key: 'buttonLabel', label: 'Button label', type: 'text', placeholder: 'Browse products' },
  { key: 'buttonHref', label: 'Button link', type: 'text', placeholder: '/all-products' },
];

const cardItemFields: StorefrontThemeSectionFieldSchema[] = [
  { key: 'imageUrl', label: 'Image', type: 'image', placeholder: 'https://… or /images/…' },
  { key: 'title', label: 'Card title', type: 'text' },
  { key: 'body', label: 'Card text', type: 'textarea' },
  { key: 'buttonLabel', label: 'Link label', type: 'text' },
  { key: 'buttonHref', label: 'Link', type: 'text', placeholder: '/all-products' },
];

export const CORE_HOMEPAGE_SECTION_TYPES: StorefrontThemeSectionTypeSchema[] = [
  {
    type: 'hero',
    label: 'Hero banner',
    description: 'Large first-screen banner with an image and up to two actions.',
    defaults: { eyebrow: 'Print made simple', title: 'Everything you need to bring your ideas to life.', body: '', buttonLabel: 'Browse products', buttonHref: '/all-products', secondaryButtonLabel: '', secondaryButtonHref: '' },
    fields: [
      ...headingFields,
      { key: 'imageUrl', label: 'Hero image', type: 'image', placeholder: 'https://… or /images/…' },
      ...primaryActionFields,
      { key: 'secondaryButtonLabel', label: 'Second button label', type: 'text' },
      { key: 'secondaryButtonHref', label: 'Second button link', type: 'text' },
    ],
  },
  {
    type: 'promo-banner',
    label: 'Promotional banner',
    description: 'Full-width campaign banner with an optional background image and action.',
    defaults: { eyebrow: 'Limited offer', title: 'Promote an offer or important service.', body: '', imageUrl: '', buttonLabel: 'Find out more', buttonHref: '/all-products' },
    fields: [...headingFields, { key: 'imageUrl', label: 'Background image', type: 'image' }, ...primaryActionFields],
  },
  {
    type: 'image-text',
    label: 'Image and text',
    description: 'Two-column story, service or company introduction block.',
    defaults: { eyebrow: '', title: 'Tell customers what makes you different.', body: '', imageUrl: '', buttonLabel: '', buttonHref: '' },
    fields: [...headingFields, { key: 'imageUrl', label: 'Image', type: 'image' }, ...primaryActionFields],
  },
  {
    type: 'rich-text',
    label: 'Text block',
    description: 'Heading and longer copy without requiring an image.',
    defaults: { eyebrow: '', title: 'Add a clear page message.', body: '', buttonLabel: '', buttonHref: '' },
    fields: [...headingFields, ...primaryActionFields],
  },
  {
    type: 'card-grid',
    label: 'Custom card grid',
    description: 'Create your own service, promotion or information tiles.',
    defaults: { eyebrow: '', title: 'Popular services', body: '', columns: '3', items: [] },
    fields: [
      ...headingFields,
      { key: 'columns', label: 'Columns on desktop', type: 'select', options: [{ label: '2 columns', value: '2' }, { label: '3 columns', value: '3' }, { label: '4 columns', value: '4' }] },
      { key: 'items', label: 'Cards', type: 'repeater', itemLabel: 'Card', min: 0, max: 12, itemFields: cardItemFields },
    ],
  },
  {
    type: 'product-grid',
    label: 'Product grid',
    description: 'Show selected products or automatically use the first published products.',
    defaults: { eyebrow: 'Shop', title: 'Featured products', body: '', productSlugs: [], limit: 6, buttonLabel: 'View all products', buttonHref: '/all-products' },
    fields: [
      ...headingFields,
      { key: 'productSlugs', label: 'Product slugs', type: 'string-list', description: 'Optional. Enter one product slug per line in the order you want them shown.' },
      { key: 'limit', label: 'Maximum products', type: 'number', min: 1, max: 12 },
      ...primaryActionFields,
    ],
  },
  {
    type: 'category-carousel',
    label: 'Category tiles',
    description: 'Show catalogue categories as visual navigation tiles.',
    defaults: { eyebrow: 'Explore', title: 'Shop by category', body: '', categorySlugs: [], limit: 6 },
    fields: [
      ...headingFields,
      { key: 'categorySlugs', label: 'Category slugs', type: 'string-list', description: 'Optional. Enter one category slug per line.' },
      { key: 'limit', label: 'Maximum categories', type: 'number', min: 1, max: 12 },
    ],
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer quotes with names, roles and optional portraits.',
    defaults: { eyebrow: 'Customer stories', title: 'What customers say', body: '', items: [] },
    fields: [
      ...headingFields,
      {
        key: 'items', label: 'Testimonials', type: 'repeater', itemLabel: 'Testimonial', min: 0, max: 12,
        itemFields: [
          { key: 'imageUrl', label: 'Portrait', type: 'image' },
          { key: 'name', label: 'Customer name', type: 'text' },
          { key: 'role', label: 'Company or role', type: 'text' },
          { key: 'quote', label: 'Quote', type: 'textarea' },
        ],
      },
    ],
  },
  {
    type: 'trust-badges',
    label: 'Trust badges',
    description: 'Compact reassurance cards for turnaround, delivery, support or quality.',
    defaults: { eyebrow: '', title: '', body: '', items: [] },
    fields: [
      ...headingFields,
      {
        key: 'items', label: 'Badges', type: 'repeater', itemLabel: 'Badge', min: 0, max: 8,
        itemFields: [
          { key: 'imageUrl', label: 'Icon or image', type: 'image' },
          { key: 'title', label: 'Badge title', type: 'text' },
          { key: 'body', label: 'Badge text', type: 'textarea' },
        ],
      },
    ],
  },
  {
    type: 'faq',
    label: 'Frequently asked questions',
    description: 'Expandable questions and answers.',
    defaults: { eyebrow: 'Help', title: 'Frequently asked questions', body: '', items: [] },
    fields: [
      ...headingFields,
      {
        key: 'items', label: 'Questions', type: 'repeater', itemLabel: 'Question', min: 0, max: 20,
        itemFields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Answer', type: 'textarea' },
        ],
      },
    ],
  },
  {
    type: 'collection-points',
    label: 'Collection points',
    description: 'Display collection locations already configured in the SaaS.',
    defaults: { eyebrow: 'Collect locally', title: 'Collection points', body: '' },
    fields: headingFields,
  },
  {
    type: 'contact-cta',
    label: 'Call to action',
    description: 'High-impact closing section for quotes, custom work or contact enquiries.',
    defaults: { eyebrow: 'Need help?', title: 'Talk to our print team.', body: '', buttonLabel: 'Request a quote', buttonHref: '/quote' },
    fields: [...headingFields, ...primaryActionFields],
  },
];
