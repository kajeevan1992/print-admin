'use client';

import type { NavItem } from './types';
import SearchHost from './SearchHost';
import SearchTrigger from './SearchTrigger';

export default function CatalogSearchHeader({ tenantSlug, storeSlug, storeBase, navItems }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[] }) {
  return <><SearchTrigger /><SearchHost tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} /></>;
}
