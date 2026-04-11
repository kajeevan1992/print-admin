import { PluginInspiredHub } from './plugin-inspired-hub';

export function PricingCommandPage() {
  return (
    <PluginInspiredHub
      title="Pricing Command"
      subtitle="A calmer control surface for pricebooks, rule stacks, margin protection, and launch pricing confidence inspired by the plugin pricing foundations."
      eyebrow="Pricing + rule orchestration"
      ctaHref="/pricing"
      ctaLabel="Open pricing"
      summaryCards={[
        { title: 'Margin guardrails', body: 'Review floors, overrides, and fallback behavior before a bad price leaks to the storefront.' },
        { title: 'Rule stack clarity', body: 'See which pricing layers should win across product, category, trade, and promotion scenarios.' },
        { title: 'Launch confidence', body: 'Make pricing reviews feel like a release ritual instead of scattered settings changes.' },
      ]}
      workflow={[
        { step: '01', title: 'Set core pricebooks', body: 'Align product families, category defaults, and customer-specific rules.' },
        { step: '02', title: 'Review modifiers and promotions', body: 'Check quantity breaks, trade pricing, promo interaction, and tax sensitivity.' },
        { step: '03', title: 'Approve launch coverage', body: 'Confirm the most important products have safe, complete pricing behavior.' },
      ]}
      insights={[
        'Inspired by the plugin pricebook, modifiers, surcharge, margin, and calculator logic.',
        'Useful as the human review layer before wiring pricing engines and API-backed calculators.',
        'Should sit close to catalog launch and promotion review so teams can spot risky changes early.',
      ]}
      linkedAreas={[
        { href: '/pricing', label: 'Pricing' },
        { href: '/pricing-rules', label: 'Pricing Rules' },
        { href: '/promotion-codes', label: 'Promotion Codes' },
        { href: '/workspace', label: 'Workspace' },
      ]}
    />
  );
}
