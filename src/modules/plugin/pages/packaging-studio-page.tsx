import { PluginInspiredHub } from './plugin-inspired-hub';

export function PackagingStudioPage() {
  return (
    <PluginInspiredHub
      title="Packaging Studio"
      subtitle="A launch-friendly view of packing rules, manifests, boxes, and dispatch behavior inspired by the plugin packaging and shipping engines."
      eyebrow="Packaging + dispatch orchestration"
      ctaHref="/shipping-methods"
      ctaLabel="Open shipping methods"
      summaryCards={[
        { title: 'Box strategy', body: 'Define how parcels, multi-box orders, and fragile items should be grouped.' },
        { title: 'Dispatch flow', body: 'Shape manifests, barcodes, and shipment prep before integrating couriers.' },
        { title: 'Rule confidence', body: 'Make packaging decisions easier to explain to ops and support teams.' },
      ]}
      workflow={[
        { step: '01', title: 'Set packaging defaults', body: 'Choose box types, weight assumptions, and allocation rules.' },
        { step: '02', title: 'Review dispatch logic', body: 'Validate manifest grouping, scan flow, and handoff checkpoints.' },
        { step: '03', title: 'Approve launch behavior', body: 'Confirm the shipping methods and packaging rules fit the store promise.' },
      ]}
      insights={[
        'Inspired by the plugin multi-box packing, packaging rules, barcode packing, dispatch manifest, and parcel shipping services.',
        'A strong candidate for future API wiring because shipping rules often influence checkout and production together.',
        'Useful for launch QA because bad packing logic becomes a customer issue very quickly.',
      ]}
      linkedAreas={[
        { href: '/shipping-methods', label: 'Shipping Methods' },
        { href: '/order-status', label: 'Order Status' },
        { href: '/orders', label: 'Orders' },
        { href: '/launch-qa', label: 'Launch QA' },
      ]}
    />
  );
}
