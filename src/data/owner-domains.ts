
export type OwnerDomainStatus = 'verified' | 'pending' | 'issue';
export type OwnerDomainType = 'primary' | 'redirect' | 'preview';

export type OwnerDomainRecord = {
  id: string;
  tenant: string;
  hostname: string;
  type: OwnerDomainType;
  status: OwnerDomainStatus;
  sslMode: string;
  dnsProvider: string;
  owner: string;
  notes: string;
};

export const ownerDomainSeed: OwnerDomainRecord[] = [
  {
    id: 'domain-1',
    tenant: 'Northstar Print',
    hostname: 'portal.northstarprint.co.uk',
    type: 'primary',
    status: 'verified',
    sslMode: 'Managed TLS',
    dnsProvider: 'Cloudflare',
    owner: 'Platform Admin',
    notes: 'Primary live domain for the storefront and admin access.'
  },
  {
    id: 'domain-2',
    tenant: 'BluePeak Mailers',
    hostname: 'demo.bluepeakmailers.com',
    type: 'preview',
    status: 'pending',
    sslMode: 'Pending validation',
    dnsProvider: 'Route 53',
    owner: 'Support Admin',
    notes: 'Preview domain waiting on DNS propagation.'
  },
  {
    id: 'domain-3',
    tenant: 'PixelPress Studio',
    hostname: 'print.pixelpress.studio',
    type: 'redirect',
    status: 'issue',
    sslMode: 'Managed TLS',
    dnsProvider: 'GoDaddy',
    owner: 'Owner Ops',
    notes: 'Redirect loop reported after the latest config change.'
  }
];
