export type Tag = { id: string; name: string; parentId?: string | null; browseBy: string; friendlyUrl: string; published: boolean; sidebar: boolean; cmsPageLink: string; };
export type TagFormValues = { name: string; parentId: string; published: boolean; sidebar: boolean; friendlyUrl: string; };
