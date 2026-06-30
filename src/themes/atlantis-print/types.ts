export type MenuItem = {
  id: string;
  slug: string;
  label: string;
  path: string;
  order: number;
  parentId: string;
  parentSlug: string;
  description: string;
  enabled: boolean;
};

export type NavColumn = { title: string; links: [string, string][] };
export type NavItem = { label: string; path: string; feature: { title: string; body: string; image: string; cta: string }; columns: NavColumn[] };
