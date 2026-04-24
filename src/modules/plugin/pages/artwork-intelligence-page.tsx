import { PluginInspiredHub } from './plugin-inspired-hub';

export function ArtworkIntelligencePage() {
  return (
    <PluginInspiredHub
      title="Artwork Intelligence"
      subtitle="Turn artwork checks, preflight, proofing, and customer approval into a cleaner guided workflow inspired by the plugin validation and artwork pipeline."
      eyebrow="Artwork + preflight review"
      ctaHref="/artwork-proofing"
      ctaLabel="Open artwork proofing"
      summaryCards={[
        { title: 'Preflight clarity', body: 'Flag missing bleed, low-resolution assets, font issues, and finishing conflicts earlier.' },
        { title: 'Approval flow', body: 'Make proofing checkpoints easier for internal teams and customers to understand.' },
        { title: 'Production readiness', body: 'Reduce the gap between design acceptance and production handoff.' },
      ]}
      workflow={[
        { step: '01', title: 'Validate incoming artwork', body: 'Run structured checks on files, templates, bleed, and output intent.' },
        { step: '02', title: 'Resolve proofing issues', body: 'Capture notes, revisions, and approvals in a clearer review rhythm.' },
        { step: '03', title: 'Promote to production', body: 'Hand off only the jobs that have passed the right design and print checks.' },
      ]}
      insights={[
        'Inspired by the plugin artwork validation, proofing state, and file quality checks.',
        'Should eventually connect to product templates, order intake, and customer notifications.',
        'Best treated as an experience layer so proofing feels trusted rather than technical.',
      ]}
      linkedAreas={[
        { href: '/artwork-proofing', label: 'Artwork Proofing' },
        { href: '/products', label: 'Products' },
        { href: '/production-planner', label: 'Production Planner' },
        { href: '/launch-qa', label: 'Launch QA' },
      ]}
    />
  );
}
