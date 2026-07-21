import type { StorefrontMediaAsset, StorefrontMediaState } from '@/modules/themes/types';

type BackendEnvelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } | string };

function errorMessage(payload: BackendEnvelope<unknown>, fallback: string) {
  if (typeof payload.error === 'string') return payload.error;
  return payload.error?.message || fallback;
}

async function readPayload<T>(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as BackendEnvelope<T>;
  if (!response.ok || !payload.ok || payload.data === undefined) throw new Error(errorMessage(payload, fallback));
  return payload.data;
}

export const storefrontMediaService = {
  list: async (storeSlug: string) => {
    const response = await fetch(`/api/internal/storefront-media?storeSlug=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' });
    return readPayload<StorefrontMediaState>(response, 'Failed to load storefront media.');
  },

  upload: async (storeSlug: string, file: File, input: { label?: string; altText?: string } = {}) => {
    const form = new FormData();
    form.set('storeSlug', storeSlug);
    form.set('file', file);
    form.set('label', input.label || '');
    form.set('altText', input.altText || '');
    const response = await fetch('/api/internal/storefront-media', { method: 'POST', body: form });
    return readPayload<StorefrontMediaAsset>(response, 'Failed to upload storefront image.');
  },

  update: async (storeSlug: string, assetId: string, input: { label?: string; altText?: string }) => {
    const response = await fetch('/api/internal/storefront-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, assetId, ...input }),
    });
    return readPayload<StorefrontMediaAsset>(response, 'Failed to update storefront image.');
  },

  remove: async (storeSlug: string, assetId: string) => {
    const query = new URLSearchParams({ storeSlug, assetId });
    const response = await fetch(`/api/internal/storefront-media?${query.toString()}`, { method: 'DELETE' });
    return readPayload<{ id: string }>(response, 'Failed to delete storefront image.');
  },
};
