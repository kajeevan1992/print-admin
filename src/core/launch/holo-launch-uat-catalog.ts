export type LaunchUatStage = 'content' | 'commerce' | 'operations' | 'launch';
export type LaunchUatStatus = 'pending' | 'pass' | 'fail' | 'na';

export type LaunchUatTaskDefinition = {
  id: string;
  stage: LaunchUatStage;
  label: string;
  detail: string;
  href: string;
  requiredForPublic: boolean;
  evidenceHint: string;
};

export const HOLO_LAUNCH_DEFAULTS = {
  tenantSlug: 'holo-print-sidcup',
  storeSlug: 'default-store',
  productSlug: 'business-cards',
  locationSlug: 'sidcup',
  storefrontPaths: ['/business-cards/sidcup', '/flyers/sidcup', '/banners/sidcup'],
};

export const HOLO_LAUNCH_UAT_TASKS: LaunchUatTaskDefinition[] = [
  {
    id: 'builder-homepage', stage: 'content', label: 'HOLO homepage built and published',
    detail: 'Use the existing Storefront Builder to publish the HOLO hero, services, trust, collection/delivery and call-to-action sections.',
    href: '/themes', requiredForPublic: true, evidenceHint: 'Live homepage URL or screenshot reference.',
  },
  {
    id: 'builder-content-pages', stage: 'content', label: 'Core content and legal pages published',
    detail: 'Publish About, Contact, Artwork Guide, Delivery, Terms, Privacy and Returns pages using the canonical content-page builder.',
    href: '/themes', requiredForPublic: true, evidenceHint: 'List the live page paths checked.',
  },
  {
    id: 'builder-navigation', stage: 'content', label: 'Header, mobile menu and footer checked',
    detail: 'Confirm navigation, dropdowns, announcement bar, account/search controls, footer columns, contact details and social links.',
    href: '/themes', requiredForPublic: true, evidenceHint: 'Desktop and mobile navigation evidence.',
  },
  {
    id: 'builder-media', stage: 'content', label: 'Images, alt text and social artwork checked',
    detail: 'Use the existing media library; confirm launch images are sharp, correctly cropped, reusable and have useful accessibility text.',
    href: '/themes', requiredForPublic: true, evidenceHint: 'Media-library review or key image URLs.',
  },
  {
    id: 'content-products', stage: 'content', label: 'Launch products and categories are complete',
    detail: 'Confirm HOLO launch products, category placement, product copy, artwork instructions, buying mode and published state.',
    href: '/products', requiredForPublic: true, evidenceHint: 'Products sampled and any exclusions.',
  },
  {
    id: 'content-seo', stage: 'content', label: 'SEO, sitemap and structured data checked',
    detail: 'Confirm titles, descriptions, canonicals, robots, sitemap, product/location pages and schema on the final HOLO domain.',
    href: '/storefront-content-readiness', requiredForPublic: true, evidenceHint: 'Readiness result and sample indexed paths.',
  },
  {
    id: 'domain-ssl', stage: 'content', label: 'Final domain, DNS and SSL are active',
    detail: 'Use the final HOLO storefront hostname before public launch and before enrolling customer passkeys.',
    href: '/store-domains', requiredForPublic: true, evidenceHint: 'Final HTTPS domain and DNS/SSL status.',
  },
  {
    id: 'pricing-core-products', stage: 'commerce', label: 'Core product pricing is manually reconciled',
    detail: 'Compare at least 20 representative website prices against HOLO production costings, including quantity breaks, materials, sides and finishing.',
    href: '/products', requiredForPublic: true, evidenceHint: 'Products/quantities checked and variance result.',
  },
  {
    id: 'pricing-custom-size', stage: 'commerce', label: 'Custom-size pricing boundaries tested',
    detail: 'Test banner/sign width and height minimums, maximums, area maths, finishing, waste, turnaround and invalid-dimension handling.',
    href: '/live-flow-check', requiredForPublic: true, evidenceHint: 'Dimensions and expected/calculated totals.',
  },
  {
    id: 'pricing-vat', stage: 'commerce', label: 'VAT treatment matches HOLO launch status',
    detail: 'Confirm store/product/add-on VAT comes only from the backend. HOLO must not charge VAT while not VAT registered, unless the business setting is deliberately changed.',
    href: '/business-defaults', requiredForPublic: true, evidenceHint: 'VAT status and mixed-product examples checked.',
  },
  {
    id: 'fulfilment', stage: 'commerce', label: 'Collection and delivery rules tested',
    detail: 'Confirm Sidcup collection details, postcode eligibility, service prices, cut-offs, blackout dates, capacity and delivery VAT.',
    href: '/settings/delivery', requiredForPublic: true, evidenceHint: 'Postcodes, dates and collection point checked.',
  },
  {
    id: 'search', stage: 'commerce', label: 'Catalogue search and product discovery tested',
    detail: 'Test title, category and SKU searches, filters, sorting, empty states and mobile suggestions.',
    href: '/storefront-content-readiness', requiredForPublic: true, evidenceHint: 'Search terms and expected products.',
  },
  {
    id: 'guest-checkout', stage: 'commerce', label: 'Guest checkout and Stripe return tested',
    detail: 'Place a controlled order from product configuration through basket, fulfilment, artwork choice, Stripe payment and verified return.',
    href: '/payment-checkout-qa', requiredForPublic: true, evidenceHint: 'Test order/payment reference and final state.',
  },
  {
    id: 'customer-account', stage: 'commerce', label: 'Customer account and recovery journey tested',
    detail: 'Test registration, verification, sign-in, password reset, profile, address, session security and order/account documents.',
    href: '/customer-public-flow-audit', requiredForPublic: true, evidenceHint: 'Test account reference and flows completed.',
  },
  {
    id: 'quote-payment', stage: 'commerce', label: 'Quote approval and payment journey tested',
    detail: 'Create, revise, send, approve and convert a formal quote; confirm final backend price reaches Stripe and the resulting order.',
    href: '/quotes', requiredForPublic: true, evidenceHint: 'Quote, order and payment references.',
  },
  {
    id: 'email-delivery', stage: 'commerce', label: 'Launch emails deliver successfully',
    detail: 'Confirm SMTP, SPF, DKIM and DMARC plus verification, reset, quote, proof, order, invoice and dispatch messages without duplicates.',
    href: '/email-outbox', requiredForPublic: true, evidenceHint: 'Inbox/provider tested and outbox result.',
  },
  {
    id: 'artwork-proof', stage: 'operations', label: 'Artwork and customer proof workflow tested',
    detail: 'Test upload-now/upload-later/design-help routing, preflight, proof revision, customer approval and change request.',
    href: '/artwork-preflight', requiredForPublic: true, evidenceHint: 'Order/proof revision and release state.',
  },
  {
    id: 'production-gates', stage: 'operations', label: 'Payment and proof production gates tested',
    detail: 'Confirm unpaid or unapproved jobs cannot start printing, while a paid and approved job progresses through production normally.',
    href: '/production-planner', requiredForPublic: true, evidenceHint: 'Blocked and released job references.',
  },
  {
    id: 'packing-dispatch', stage: 'operations', label: 'Packing, box verification and dispatch tested',
    detail: 'Create multiple boxes, record contents/weights, print labels, scan each box and confirm handover stays blocked until every box is verified.',
    href: '/dispatch-center', requiredForPublic: true, evidenceHint: 'Shipment reference and box verification result.',
  },
  {
    id: 'tracking', stage: 'operations', label: 'Customer tracking timeline tested',
    detail: 'Confirm the matching order email can view proof, production, box, dispatch, collection and delivery progress without internal data exposure.',
    href: '/track-order', requiredForPublic: true, evidenceHint: 'Order reference and stages observed.',
  },
  {
    id: 'refund-credit-note', stage: 'operations', label: 'Refund and credit-note workflow tested',
    detail: 'Verify a controlled refund produces the correct payment state, credit note, VAT treatment, customer document and reconciliation result.',
    href: '/invoices', requiredForPublic: true, evidenceHint: 'Refund and credit-note references.',
  },
  {
    id: 'security', stage: 'operations', label: 'Security and public-flow audits are clear',
    detail: 'Confirm tenant isolation, admin protection, customer ownership, token handling, rate limits and private cache/indexing rules.',
    href: '/launch-security-access-audit', requiredForPublic: true, evidenceHint: 'Audit result and any accepted review items.',
  },
  {
    id: 'runtime-hardening', stage: 'operations', label: 'Production runtime hardening confirmed',
    detail: 'Confirm Node 22 LTS, fail-closed migrations, production-disabled development seed and production-only CORS origins.',
    href: '/live-environment-readiness', requiredForPublic: true, evidenceHint: 'Deployment/runtime readiness result.',
  },
  {
    id: 'backup-restore', stage: 'operations', label: 'Database backup and restore drill completed',
    detail: 'Confirm automated PostgreSQL backups, retention, access and one successful restore into an isolated environment.',
    href: '/data-continuity', requiredForPublic: true, evidenceHint: 'Backup timestamp and restore drill result.',
  },
  {
    id: 'device-accessibility', stage: 'operations', label: 'Mobile, browser and accessibility checks completed',
    detail: 'Test current Chrome, Safari and mobile layouts; keyboard navigation, focus, labels, contrast, errors and image performance.',
    href: '/button-audit', requiredForPublic: true, evidenceHint: 'Devices/browsers and accessibility findings.',
  },
  {
    id: 'test-data-cleanup', stage: 'launch', label: 'Test data is isolated or removed',
    detail: 'Remove or clearly archive TEST-HOLO customers, orders, payments, invoices, proofs, production jobs and shipments before public reporting.',
    href: '/launch-test-data-cleanup', requiredForPublic: true, evidenceHint: 'Cleanup run result and remaining test references.',
  },
  {
    id: 'final-blockers', stage: 'launch', label: 'Final launch blocker run is clear',
    detail: 'Run the existing aggregated readiness checks with HOLO business-cards, Sidcup and the representative storefront paths.',
    href: '/final-launch-blockers', requiredForPublic: true, evidenceHint: 'Confidence, blocker count and run timestamp.',
  },
  {
    id: 'first-live-order', stage: 'launch', label: 'First live order is actively monitored',
    detail: 'Watch the first real HOLO order from payment through artwork, proof, production, email, packing and handover.',
    href: '/first-live-order-monitor', requiredForPublic: true, evidenceHint: 'First live order reference and monitor outcome.',
  },
  {
    id: 'post-launch-health', stage: 'launch', label: 'Post-launch health review completed',
    detail: 'After opening traffic, check errors, payments, emails, orders, queues, search, SEO and performance before increasing promotion.',
    href: '/post-launch-health', requiredForPublic: true, evidenceHint: 'Health run timestamp and any follow-up action.',
  },
  {
    id: 'manual-fallback', stage: 'launch', label: 'Manual service fallback is ready',
    detail: 'Document how HOLO will take a quote, payment, artwork and delivery instruction manually if an automated step is temporarily unavailable.',
    href: '/production-smoke-test', requiredForPublic: true, evidenceHint: 'Fallback owner and operating note.',
  },
];
