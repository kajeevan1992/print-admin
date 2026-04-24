export type TenantDomainRecord = {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: 'active' | 'setup-required' | 'attention-needed';
  defaultSubdomain: string;
  customDomain: string;
  domainVerification: 'verified' | 'pending' | 'not-added';
  sslStatus: 'issued' | 'pending' | 'not-started';
  primaryDomain: string;
};

export const superadminTenantDomainSeed: TenantDomainRecord[] = [
  {
    tenantId: 'tenant-001',
    tenantName: 'User 1 Print',
    plan: 'Growth',
    status: 'active',
    defaultSubdomain: 'user1.printcore.com',
    customDomain: 'www.user1.com',
    domainVerification: 'verified',
    sslStatus: 'issued',
    primaryDomain: 'www.user1.com'
  },
  {
    tenantId: 'tenant-002',
    tenantName: 'BluePeak Events',
    plan: 'Starter',
    status: 'setup-required',
    defaultSubdomain: 'bluepeak.printcore.com',
    customDomain: '',
    domainVerification: 'not-added',
    sslStatus: 'not-started',
    primaryDomain: 'bluepeak.printcore.com'
  },
  {
    tenantId: 'tenant-003',
    tenantName: 'Northstar Print',
    plan: 'Pro',
    status: 'attention-needed',
    defaultSubdomain: 'northstar.printcore.com',
    customDomain: 'shop.northstarprint.co.uk',
    domainVerification: 'pending',
    sslStatus: 'pending',
    primaryDomain: 'northstar.printcore.com'
  }
];
