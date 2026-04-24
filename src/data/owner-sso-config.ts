
export type OwnerSsoStatus = 'draft' | 'active' | 'paused';
export type OwnerSsoProtocol = 'saml' | 'oidc';

export type OwnerSsoConfigRecord = {
  id: string;
  tenant: string;
  providerName: string;
  protocol: OwnerSsoProtocol;
  status: OwnerSsoStatus;
  domainHint: string;
  lastValidatedAt: string;
  owner: string;
  notes: string;
};

export const ownerSsoConfigSeed: OwnerSsoConfigRecord[] = [
  {
    id: 'sso-1',
    tenant: 'Northstar Print',
    providerName: 'Microsoft Entra ID',
    protocol: 'oidc',
    status: 'active',
    domainHint: 'northstarprint.co.uk',
    lastValidatedAt: '2026-04-12 10:20',
    owner: 'Owner Ops',
    notes: 'Primary enterprise login for Northstar staff.'
  },
  {
    id: 'sso-2',
    tenant: 'BluePeak Mailers',
    providerName: 'Okta Workforce',
    protocol: 'saml',
    status: 'draft',
    domainHint: 'bluepeakmailers.com',
    lastValidatedAt: '2026-04-11 14:05',
    owner: 'Support Admin',
    notes: 'Waiting for IdP metadata confirmation.'
  },
  {
    id: 'sso-3',
    tenant: 'PixelPress Studio',
    providerName: 'Google Workspace',
    protocol: 'oidc',
    status: 'paused',
    domainHint: 'pixelpress.studio',
    lastValidatedAt: '2026-04-10 09:40',
    owner: 'Platform Admin',
    notes: 'Paused during onboarding scope review.'
  }
];
