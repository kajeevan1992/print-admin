import { platformPrisma } from '@/core/db/platform-prisma';
import type { MenuItem } from '@/themes/atlantis-native/types';
import { DEFAULT_STOREFRONT_MENU } from './default-menu';
import { normaliseRuntimeMenuItem } from './menu-normaliser';

export async function loadRuntimeMenuItems(tenantIds: string[]) {
  for (const tenantId of tenantIds) {
    try {
      const rows = await platformPrisma.coreCatalogRecord.findMany({
        where: { tenantId, resource: 'admin-config', slug: 'storefront-menu-builder' },
        select: { metadataJson: true },
        take: 1,
      });
      const rawItems = (rows[0]?.metadataJson as any)?.items;
      const items = Array.isArray(rawItems)
        ? rawItems.map(normaliseRuntimeMenuItem).filter((item: MenuItem) => item.enabled && item.label && item.path).sort((a: MenuItem, b: MenuItem) => a.order - b.order)
        : [];
      if (items.length) return items;
    } catch {}
  }
  return DEFAULT_STOREFRONT_MENU;
}
