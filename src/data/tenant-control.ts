export type TenantEnvironment = "staging" | "launch_ready" | "live" | "attention";
export type TenantActivation = "not_started" | "configuring" | "qa" | "live";

export type TenantControlRecord = {
  id: string;
  company: string;
  owner: string;
  segment: string;
  environment: TenantEnvironment;
  activation: TenantActivation;
  stores: number;
  domainsReady: boolean;
  catalogReady: boolean;
  checkoutReady: boolean;
  risk: "healthy" | "watch" | "critical";
  notes: string;
};

export const tenantControlSeed: TenantControlRecord[] = [
  {
    id: 'tenant-1',
    company: 'Northstar Print',
    owner: 'Sophie Patel',
    segment: 'Growth',
    environment: 'live',
    activation: 'live',
    stores: 3,
    domainsReady: true,
    catalogReady: true,
    checkoutReady: true,
    risk: 'healthy',
    notes: 'Flagship customer with full storefront rollout.'
  },
  {
    id: 'tenant-2',
    company: 'Blue Peak Labels',
    owner: 'Mina Chen',
    segment: 'Starter',
    environment: 'launch_ready',
    activation: 'qa',
    stores: 1,
    domainsReady: true,
    catalogReady: true,
    checkoutReady: false,
    risk: 'watch',
    notes: 'Checkout text still awaiting signoff.'
  },
  {
    id: 'tenant-3',
    company: 'TradePrint Warehouse',
    owner: 'Jordan Lee',
    segment: 'Enterprise',
    environment: 'attention',
    activation: 'configuring',
    stores: 2,
    domainsReady: false,
    catalogReady: true,
    checkoutReady: false,
    risk: 'critical',
    notes: 'Custom domain and VAT logic still blocked.'
  }
];
