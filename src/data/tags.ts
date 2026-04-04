import type { Tag } from '@/modules/tags/types';

export const tagsMock: Tag[] = [
  {
    id: 'tag-1001',
    name: 'Business Cards',
    parentId: null,
    browseBy: '',
    friendlyUrl: 'tag/business-cards',
    published: true,
    sidebar: true,
    cmsPageLink: '<%= PageLink(1001) %>'
  },
  {
    id: 'tag-1002',
    name: 'Luxury Print',
    parentId: null,
    browseBy: '',
    friendlyUrl: 'tag/luxury-print',
    published: true,
    sidebar: false,
    cmsPageLink: '<%= PageLink(1002) %>'
  },
  {
    id: 'tag-1003',
    name: 'Foil Finish',
    parentId: 'tag-1002',
    browseBy: 'Luxury Print',
    friendlyUrl: 'tag/foil-finish',
    published: true,
    sidebar: true,
    cmsPageLink: '<%= PageLink(1003) %>'
  }
];
