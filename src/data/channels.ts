import type { Channel } from '@/modules/channels/types';

export const channelsMock: Channel[] = [
  {
    id: 'ch-1',
    name: 'US Main Store',
    slug: 'us-main',
    domain: 'print.example.com',
    status: 'active',
    themeId: 'th-1',
    currency: 'USD',
    locale: 'en-US',
    isHeadless: false,
    createdAt: '2026-01-22',
    publicApiKey: 'pub_us_main_8f31',
    privateApiKey: 'priv_us_main_2k19'
  },
  {
    id: 'ch-2',
    name: 'B2B Wholesale API',
    slug: 'b2b-api',
    domain: '',
    status: 'active',
    themeId: 'th-2',
    currency: 'USD',
    locale: 'en-US',
    isHeadless: true,
    createdAt: '2026-03-03',
    publicApiKey: 'pub_b2b_2ja3',
    privateApiKey: 'priv_b2b_9a21'
  }
];
