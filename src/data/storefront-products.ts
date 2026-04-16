export type StorefrontProductCategory =
  | 'business-cards'
  | 'flyers'
  | 'brochures'
  | 'signage'
  | 'packaging'
  | 'direct-mail';

export type StorefrontProduct = {
  id: string;
  title: string;
  subtitle: string;
  category: StorefrontProductCategory;
  badge?: string;
  priceFrom: string;
  turnaround: string;
  popular?: boolean;
  onlineDesign?: boolean;
  uploadArtwork?: boolean;
  templateReady?: boolean;
};

export const storefrontCategories: { id: StorefrontProductCategory; label: string; description: string }[] = [
  { id: 'business-cards', label: 'Business Cards', description: 'Premium cards, quick reorders, and template-ready products.' },
  { id: 'flyers', label: 'Flyers', description: 'Promotional print for campaigns, events, and local marketing.' },
  { id: 'brochures', label: 'Brochures', description: 'Folded print and booklet-style formats for richer information.' },
  { id: 'signage', label: 'Signage', description: 'Posters, banners, and display materials for retail or events.' },
  { id: 'packaging', label: 'Packaging', description: 'Advanced packaging products and quote-led custom boxes.' },
  { id: 'direct-mail', label: 'Direct Mail', description: 'Mail-ready print products and campaign support flows.' }
];

export const storefrontProducts: StorefrontProduct[] = [
  {
    id: 'standard-business-cards',
    title: 'Standard Business Cards',
    subtitle: 'Fast-turn business cards with upload, template, and reorder flows.',
    category: 'business-cards',
    badge: 'Top seller',
    priceFrom: '£19',
    turnaround: '2-3 days',
    popular: true,
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'luxury-business-cards',
    title: 'Luxury Business Cards',
    subtitle: 'Premium stocks and finishes for executive or luxury brand presentation.',
    category: 'business-cards',
    badge: 'Premium',
    priceFrom: '£39',
    turnaround: '4-5 days',
    onlineDesign: false,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'a5-flyers',
    title: 'A5 Flyers',
    subtitle: 'Campaign flyers with simple upload or online customization flow.',
    category: 'flyers',
    badge: 'Campaign',
    priceFrom: '£29',
    turnaround: '2-3 days',
    popular: true,
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'folded-leaflets',
    title: 'Folded Leaflets',
    subtitle: 'Folded promotional print for menus, brochures, and service overviews.',
    category: 'flyers',
    priceFrom: '£45',
    turnaround: '3-4 days',
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'tri-fold-brochures',
    title: 'Tri-fold Brochures',
    subtitle: 'Structured brochure format for product overviews and service packs.',
    category: 'brochures',
    badge: 'Popular',
    priceFrom: '£59',
    turnaround: '4-5 days',
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'booklet-brochures',
    title: 'Booklet Brochures',
    subtitle: 'Multi-page brochure products for presentations and catalogues.',
    category: 'brochures',
    priceFrom: '£89',
    turnaround: '5-7 days',
    onlineDesign: false,
    uploadArtwork: true,
    templateReady: false
  },
  {
    id: 'event-posters',
    title: 'Event Posters',
    subtitle: 'Large-format print for internal campaigns, events, and promotions.',
    category: 'signage',
    badge: 'Display',
    priceFrom: '£35',
    turnaround: '2-4 days',
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'roller-banners',
    title: 'Roller Banners',
    subtitle: 'Portable signage for events, lobbies, and sales presentations.',
    category: 'signage',
    priceFrom: '£109',
    turnaround: '4-6 days',
    onlineDesign: false,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'mailer-boxes',
    title: 'Mailer Boxes',
    subtitle: 'Quote-led packaging path with advanced size and finish configuration.',
    category: 'packaging',
    badge: 'Advanced',
    priceFrom: 'From £89',
    turnaround: 'Quote based',
    popular: true,
    onlineDesign: false,
    uploadArtwork: false,
    templateReady: false
  },
  {
    id: 'product-labels',
    title: 'Product Labels',
    subtitle: 'Label products for retail packaging and promotional product lines.',
    category: 'packaging',
    priceFrom: '£49',
    turnaround: '3-5 days',
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'postcard-mailers',
    title: 'Postcard Mailers',
    subtitle: 'Direct mail campaign products with address-ready downstream workflows.',
    category: 'direct-mail',
    badge: 'Mail ready',
    priceFrom: '£69',
    turnaround: '5-7 days',
    popular: true,
    onlineDesign: true,
    uploadArtwork: true,
    templateReady: true
  },
  {
    id: 'letter-pack-mailers',
    title: 'Letter Pack Mailers',
    subtitle: 'Campaign print packs for personalized or targeted mail drops.',
    category: 'direct-mail',
    priceFrom: 'Quote / £99',
    turnaround: 'Quote based',
    onlineDesign: false,
    uploadArtwork: true,
    templateReady: false
  }
];
