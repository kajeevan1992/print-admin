import type { MenuItem } from '@/themes/atlantis-native/types';

export const DEFAULT_STOREFRONT_MENU: MenuItem[] = [
  { id: 'same-day', slug: 'same-day-printing', label: 'Same Day Printing', path: '/same-day-printing', order: 1, parentId: '', parentSlug: '', description: 'Fast print options for urgent jobs.', enabled: true },
  { id: 'business-cards', slug: 'business-cards', label: 'Business Cards', path: '/business-cards', order: 2, parentId: '', parentSlug: '', description: 'Premium cards and finishes.', enabled: true },
  { id: 'flyers', slug: 'flyers', label: 'Flyers', path: '/flyers', order: 3, parentId: '', parentSlug: '', description: 'Leaflets and flyer printing.', enabled: true },
  { id: 'posters', slug: 'posters-large-format-prints', label: 'Posters', path: '/posters-large-format-prints', order: 4, parentId: '', parentSlug: '', description: 'Indoor and outdoor posters.', enabled: true },
  { id: 'booklets', slug: 'booklets', label: 'Booklets', path: '/booklets', order: 5, parentId: '', parentSlug: '', description: 'Stapled and bound booklets.', enabled: true },
  { id: 'stationery', slug: 'stationery', label: 'Stationery', path: '/stationery', order: 6, parentId: '', parentSlug: '', description: 'Letterheads and office print.', enabled: true },
  { id: 'signage', slug: 'signage', label: 'Signage', path: '/signage', order: 7, parentId: '', parentSlug: '', description: 'Boards, banners and signs.', enabled: true },
  { id: 'all-products', slug: 'all-products', label: 'All Products', path: '/all-products', order: 8, parentId: '', parentSlug: '', description: 'Browse every print product.', enabled: true },
  { id: 'bespoke', slug: 'bespoke-quote', label: 'Bespoke Quote', path: '/bespoke-quote', order: 9, parentId: '', parentSlug: '', description: 'Custom sizes and special jobs.', enabled: true },
];
