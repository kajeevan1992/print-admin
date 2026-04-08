import { PluginInspiredHub } from './plugin-inspired-hub';

export function LicensingCenterPage() {
  return (
    <PluginInspiredHub
      title="Licensing Center"
      subtitle="Manage plan catalog, tenant entitlements, seat rules, and renewal readiness using ideas from the plugin licensing foundations."
      eyebrow="Licensing + control plane"
      ctaHref="/organizations"
      ctaLabel="Open organizations"
      summaryCards={[
        { title: 'Plan catalog', body: 'Shape SaaS plans, feature gates, and storefront access rules in one calmer surface.' },
        { title: 'Seat enforcement', body: 'Track seat limits, overages, trial status, and activation health before launch.' },
        { title: 'Renewal readiness', body: 'Make upgrade prompts, grace periods, and account recovery flows more intentional.' },
      ]}
      workflow={[
        { step: '01', title: 'Map plans to capabilities', body: 'Define which plans unlock products, production tools, support, and API access.' },
        { step: '02', title: 'Assign tenants and seats', body: 'Attach organizations to plans, set seat envelopes, and flag accounts at risk.' },
        { step: '03', title: 'Monitor entitlement drift', body: 'Review expiring access, failed syncs, or manual overrides before they become support issues.' },
      ]}
      insights={[
        'Inspired by the plugin foundations around hosted licensing, plan catalogs, seat activation, and customer dashboards.',
        'Best used as the commercial truth before wiring billing and external provisioning.',
        'Keeps launch reviews focused on entitlement clarity rather than raw settings screens.',
      ]}
      linkedAreas={[
        { href: '/organizations', label: 'Organizations' },
        { href: '/api-access', label: 'API Access' },
        { href: '/api-keys', label: 'API Keys' },
        { href: '/launch-readiness', label: 'Launch Readiness' },
      ]}
    />
  );
}
