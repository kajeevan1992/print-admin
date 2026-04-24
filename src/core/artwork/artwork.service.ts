import type { TenantContext } from '../tenant/types';

const now = () => new Date().toISOString();

export async function listArtwork(_ctx: TenantContext) {
  return {
    items: [
      {
        id: 'art-business-card-proof',
        orderReference: 'ORD-32024',
        customerEmail: 'studio@acmeoffice.example',
        fileName: 'business-card-front.pdf',
        status: 'awaiting-review',
        note: 'Awaiting prepress review before customer approval.',
        createdAt: now(),
      },
      {
        id: 'art-flyer-revision',
        orderReference: 'ORD-32031',
        customerEmail: 'sarah@brightdental.example',
        fileName: 'direct-mail-letter-pack.pdf',
        status: 'awaiting-customer-fix',
        note: 'Bleed issue on folded panel and missing postage zone margin.',
        createdAt: now(),
      },
      {
        id: 'art-catalog-approved',
        orderReference: 'ORD-32018',
        customerEmail: 'ops@northwindoffice.example',
        fileName: 'premium-catalog-a4.pdf',
        status: 'approved',
        note: 'Approved and ready for production handoff.',
        createdAt: now(),
      },
    ],
    source: 'internal-core' as const,
  };
}

export async function updateArtworkStatus(_ctx: TenantContext, _artworkId: string, _status: string) {
  return { ok: true };
}
