import StorefrontChrome from './StorefrontChrome';
import CustomerArtworkProofClient from './CustomerArtworkProofClient';
import { Shell } from './HomePrimitives';
import type { NavItem } from './types';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';

export default function CustomerArtworkProofPage({ tenantSlug, storeSlug, storeBase, navItems, settings, token = '', proofId = '' }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; token?: string; proofId?: string }) {
  return <StorefrontChrome currentPath="/artwork-proof" navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10 sm:py-14"><Shell><CustomerArtworkProofClient tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} token={token} proofId={proofId} /></Shell></section></StorefrontChrome>;
}
