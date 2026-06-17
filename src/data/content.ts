export type ContentKind = 'blog' | 'page' | 'category' | 'extended';

export type ContentRecord = {
  id: string;
  kind: ContentKind;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
  author: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle?: string;
  heroIntro?: string;
  heroImage?: string;
  menuLabel?: string;
  menuDescription?: string;
  menuOrder?: number;
  showInMenu?: boolean;
  canonicalPath?: string;
};

export type HtmlSnippet = {
  id: string;
  name: string;
  location: 'head' | 'footer' | 'product-page' | 'checkout';
  status: 'draft' | 'published';
  updatedAt: string;
  code: string;
  notes: string;
};

export const contentRecordsSeed: ContentRecord[] = [
  {
    id: 'cnt-blog-1',
    kind: 'blog',
    title: 'Spring Launch Campaign',
    slug: 'spring-launch-campaign',
    status: 'published',
    updatedAt: '2026-04-02',
    author: 'Marketing Team',
    summary: 'Homepage story announcing seasonal print launches and campaign bundles.',
    body: 'Introduce seasonal print launches, promotional bundles, and featured templates for key verticals.',
    seoTitle: 'Spring Launch Campaign',
    seoDescription: 'Discover spring product launches and featured print campaigns.'
  },
  {
    id: 'cnt-page-1',
    kind: 'page',
    title: 'About Our Print Platform',
    slug: 'about-print-platform',
    status: 'published',
    updatedAt: '2026-04-01',
    author: 'Admin',
    summary: 'Brand story and service overview page.',
    body: 'Tell the story of the platform, key differentiators, and service commitments.',
    seoTitle: 'About Our Print Platform',
    seoDescription: 'Learn about our print commerce platform and services.'
  },
  {
    id: 'cnt-category-1',
    kind: 'category',
    title: 'Business Cards Category CMS',
    slug: 'business-cards',
    status: 'draft',
    updatedAt: '2026-03-30',
    author: 'Catalog Ops',
    summary: 'Category copy, banners, and browse/upload/create permissions.',
    body: 'Configure hero copy, browse text, upload/create blocks, and category-specific support messaging.',
    seoTitle: 'Business Cards',
    seoDescription: 'Explore premium business card printing options.',
    heroTitle: 'Business card options for teams, brands and everyday networking.',
    heroIntro: 'Compare standard, premium and related business stationery products before choosing a product or quote route.',
    heroImage: '/images/business-card-front.svg',
    menuLabel: 'Business Cards',
    menuDescription: 'Premium presentation for your brand, team and customer touchpoints.',
    menuOrder: 10,
    showInMenu: true,
    canonicalPath: '/business-cards'
  },
  {
    id: 'cnt-extended-1',
    kind: 'extended',
    title: 'Wholesale Landing Variant',
    slug: 'wholesale-landing-variant',
    status: 'draft',
    updatedAt: '2026-03-28',
    author: 'Growth Team',
    summary: 'Extended content entry used for targeted B2B landing pages.',
    body: 'Custom content blocks for B2B account acquisition with form embeds and CTA variants.',
    seoTitle: 'Wholesale Print Program',
    seoDescription: 'A custom wholesale print landing page for trade buyers.'
  }
];

export const htmlSnippetsSeed: HtmlSnippet[] = [
  {
    id: 'snippet-1',
    name: 'Global Analytics',
    location: 'head',
    status: 'draft',
    updatedAt: '2026-04-02',
    code: '<script>window.dataLayer = window.dataLayer || [];</script>',
    notes: 'Core analytics boot snippet.'
  },
  {
    id: 'snippet-2',
    name: 'Checkout Trust Banner',
    location: 'checkout',
    status: 'draft',
    updatedAt: '2026-04-01',
    code: '<div class="trust-banner">Secure checkout and print-ready proofing included.</div>',
    notes: 'Displayed above checkout summary.'
  }
];
