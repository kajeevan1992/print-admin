import { PluginInspiredHub } from './plugin-inspired-hub';

export function DispatchCenterPage() {
  return (
    <PluginInspiredHub
      title="Dispatch Center"
      subtitle="A cleaner dispatch and delivery handoff surface inspired by the plugin manifest, parcel, barcode, and courier orchestration logic."
      eyebrow="Dispatch + delivery coordination"
      ctaHref="/orders"
      ctaLabel="Open orders"
      summaryCards={[
        { title: 'Manifest readiness', body: 'Group shipments, labels, and handoff checkpoints into one launch-friendly review surface.' },
        { title: 'Courier confidence', body: 'Review how packaging, service level, and routing decisions affect the customer promise.' },
        { title: 'Scan-friendly flow', body: 'Design a dispatch routine that feels deliberate for ops teams, not improvised.' },
      ]}
      workflow={[
        { step: '01', title: 'Assemble dispatch groups', body: 'Gather ready orders into batches by carrier, service level, or production cut-off.' },
        { step: '02', title: 'Validate labels and manifests', body: 'Check packaging fit, barcode flow, and shipment completeness.' },
        { step: '03', title: 'Release to carrier handoff', body: 'Confirm the shipment leaves with the right promise and tracking state.' },
      ]}
      insights={[
        'Inspired by the plugin dispatch manifest, parcel services, barcode packing, and delivery flow.',
        'Should connect later to shipping integrations, status updates, and support surfaces.',
        'A strong place to make the ops experience feel premium and predictable.',
      ]}
      linkedAreas={[
        { href: '/packaging-studio', label: 'Packaging Studio' },
        { href: '/shipping-methods', label: 'Shipping Methods' },
        { href: '/order-status', label: 'Order Status' },
        { href: '/support-tickets', label: 'Support Tickets' },
      ]}
    />
  );
}
