import type { Id } from '@/types/common';

export type ChannelStatus = 'active' | 'inactive';

export type Channel = {
  id: Id;
  name: string;
  slug: string;
  domain?: string;
  status: ChannelStatus;
  themeId: Id;
  currency: string;
  locale: string;
  isHeadless: boolean;
  createdAt: string;
  publicApiKey: string;
  privateApiKey: string;
};

export type ChannelForm = {
  name: string;
  slug: string;
  domain: string;
  status: ChannelStatus;
  themeId: Id;
  currency: string;
  locale: string;
  isHeadless: boolean;
};
