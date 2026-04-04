import type { Id } from '@/types/common';

export type CategoryTag = {
  id: Id;
  label: string;
};

export type Category = {
  id: Id;
  name: string;
  description: string;
  parentId: Id | null;
  pricingId: string;
  attributeSetId: string;
  published: boolean;
  thumbnail: string;
  friendlyUrl: string;
  productCount: number;
  sortOrder: number;
  accuZipConfig: string;
  useAlternateMaster: boolean;
  tags: CategoryTag[];
  canBrowse: boolean;
  canUpload: boolean;
  canUploadLater: boolean;
  canCreate: boolean;
  canCustom: boolean;
};

export type CategoryFormValues = {
  name: string;
  description: string;
  parentId: string;
  pricingId: string;
  attributeSetId: string;
  published: boolean;
  thumbnail: string;
  friendlyUrl: string;
  accuZipConfig: string;
  useAlternateMaster: boolean;
  selectedTagId: string;
  tagIds: string[];
  canBrowse: boolean;
  canUpload: boolean;
  canUploadLater: boolean;
  canCreate: boolean;
  canCustom: boolean;
};
