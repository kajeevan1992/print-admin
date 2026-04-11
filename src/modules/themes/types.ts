import type { Id } from '@/types/common';

export type Theme = {
  id: Id;
  name: string;
  description: string;
  version: string;
  author: string;
  previewImage: string;
  supportedFeatures: string[];
  createdAt: string;
};
