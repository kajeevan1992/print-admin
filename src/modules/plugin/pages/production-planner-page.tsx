import { PluginInspiredHub } from './plugin-inspired-hub';

export function ProductionPlannerPage() {
  return (
    <PluginInspiredHub
      title="Production Planner"
      subtitle="Use plugin-inspired scheduling, routing, and machine-capability ideas to make production feel more deliberate and less reactive."
      eyebrow="Production planning + routing"
      ctaHref="/production-board"
      ctaLabel="Open production board"
      summaryCards={[
        { title: 'Routing readiness', body: 'Model how jobs move across machines, finishing, and dispatch stages.' },
        { title: 'Capacity review', body: 'See where work is likely to bunch up before it becomes a fire drill.' },
        { title: 'Planner rituals', body: 'Turn production reviews into a more visual planning routine.' },
      ]}
      workflow={[
        { step: '01', title: 'Model intake and routing', body: 'Define the first touchpoint, process type, and machine suitability.' },
        { step: '02', title: 'Balance durations and queues', body: 'Compare expected durations against board load and upcoming deadlines.' },
        { step: '03', title: 'Promote to live board', body: 'Move the clearest plan into the production board once it is ready.' },
      ]}
      insights={[
        'Inspired by the plugin production planner UI, scheduler, routing, timeline visualizer, and load balancer pieces.',
        'Should help you shape future production-board improvements and not just another list page.',
        'Useful for premium B2B print operations where deadlines and routing confidence matter.',
      ]}
      linkedAreas={[
        { href: '/production', label: 'Production' },
        { href: '/production-board', label: 'Production Board' },
        { href: '/printer-management', label: 'Printer Management' },
        { href: '/artwork-proofing', label: 'Artwork Proofing' },
      ]}
    />
  );
}
