import type { Theme } from '@/modules/themes/types';

export const themesMock: Theme[] = [
  {
    id: 'th-1',
    name: 'Night Commerce',
    description: 'Premium dark storefront with editorial product pages.',
    version: '2.4.1',
    author: 'Print Admin Team',
    previewImage: 'NC',
    supportedFeatures: ['Dynamic Product Pages', 'Landing Blocks', 'Mega Menu'],
    createdAt: '2026-02-11'
  },
  {
    id: 'th-2',
    name: 'Studio Light',
    description: 'Minimal clean catalog-first storefront.',
    version: '1.9.0',
    author: 'Print Admin Team',
    previewImage: 'SL',
    supportedFeatures: ['Grid Catalog', 'Promo Banners', 'Quick Quote'],
    createdAt: '2026-01-05'
  }
];
