import type { TenantContext } from '../tenant/types';

export async function listArtwork(_ctx: TenantContext) {
  return { items: [], source: 'internal-core' as const };
}

export async function updateArtworkStatus(_ctx: TenantContext, _artworkId: string, _status: string) {
  return { ok: true };
}
