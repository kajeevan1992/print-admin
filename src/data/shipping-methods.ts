export type ShippingMethodStatus = 'active' | 'pilot' | 'paused';
export type ShippingMethodChannel = 'DTC' | 'B2B' | 'Marketplace' | 'Pickup';
export type ShippingRiskBand = 'healthy' | 'watch' | 'critical';
export type DeliveryFulfilmentMode = 'delivery' | 'collection' | 'local-courier' | 'freight' | 'trade-drop-ship';
export type DeliveryZoneType = 'uk-mainland' | 'london' | 'local-postcodes' | 'pickup' | 'manual';
export type DeliveryPricingBasis = 'flat' | 'free-over-threshold' | 'postcode' | 'weight' | 'manual-quote';
export type DeliveryTaxClass = 'standard' | 'zero' | 'exempt';

export type ShippingMethodRecord = {
  id: string;
  name: string;
  channel: ShippingMethodChannel;
  status: ShippingMethodStatus;
  risk: ShippingRiskBand;
  carrier: string;
  serviceLevel: string;
  cutoffTime: string;
  transitDays: string;
  surcharge: number;
  eligiblePlants: string[];
  owner: string;
  notes: string;
  enabled: boolean;
  showAtCheckout: boolean;
  publicLabel: string;
  checkoutDescription: string;
  fulfilmentMode: DeliveryFulfilmentMode;
  zoneType: DeliveryZoneType;
  zoneName: string;
  postcodeRules: string;
  pricingBasis: DeliveryPricingBasis;
  basePriceMinor: number;
  freeAboveMinor?: number;
  minSubtotalMinor?: number;
  maxSubtotalMinor?: number;
  maxWeightKg?: number;
  productionBufferDays: number;
  sameDayEligible: boolean;
  nextDayEligible: boolean;
  requiresManualApproval: boolean;
  sortOrder: number;
  taxClass: DeliveryTaxClass;
};

export const shippingMethodRecordsMock: ShippingMethodRecord[] = [
  {
    id: 'delivery-collection-sidcup',
    name: 'Customer Collection',
    channel: 'Pickup',
    status: 'active',
    risk: 'healthy',
    carrier: 'Internal',
    serviceLevel: 'Shop collection slot',
    cutoffTime: '17:00',
    transitDays: 'Same day when ready',
    surcharge: 0,
    eligiblePlants: ['Sidcup shop'],
    owner: 'Store team',
    notes: 'Free collection from the shop once production is completed and the order is marked ready.',
    enabled: true,
    showAtCheckout: true,
    publicLabel: 'Collect from store',
    checkoutDescription: 'Free collection from our shop. We will notify the customer when the order is ready.',
    fulfilmentMode: 'collection',
    zoneType: 'pickup',
    zoneName: 'Sidcup collection counter',
    postcodeRules: '',
    pricingBasis: 'flat',
    basePriceMinor: 0,
    freeAboveMinor: 0,
    productionBufferDays: 0,
    sameDayEligible: true,
    nextDayEligible: true,
    requiresManualApproval: false,
    sortOrder: 10,
    taxClass: 'standard'
  },
  {
    id: 'delivery-london-same-day',
    name: 'London Same-Day Courier',
    channel: 'DTC',
    status: 'active',
    risk: 'watch',
    carrier: 'Local courier',
    serviceLevel: 'Same-day London',
    cutoffTime: '12:00',
    transitDays: 'Same day after production',
    surcharge: 18,
    eligiblePlants: ['Sidcup shop', 'South London'],
    owner: 'Dispatch team',
    notes: 'Only show for London postcodes and production-ready jobs that can dispatch before the courier cutoff.',
    enabled: true,
    showAtCheckout: true,
    publicLabel: 'Same-day London courier',
    checkoutDescription: 'Available for eligible London postcodes when production and artwork approval are completed before cutoff.',
    fulfilmentMode: 'local-courier',
    zoneType: 'london',
    zoneName: 'London postcodes',
    postcodeRules: 'E*, EC*, N*, NW*, SE*, SW*, W*, WC*, BR*, CR*, DA*, KT*, SM*, TW*',
    pricingBasis: 'postcode',
    basePriceMinor: 1800,
    freeAboveMinor: undefined,
    productionBufferDays: 0,
    sameDayEligible: true,
    nextDayEligible: false,
    requiresManualApproval: true,
    sortOrder: 20,
    taxClass: 'standard'
  },
  {
    id: 'delivery-uk-next-day',
    name: 'UK Next-Day Delivery',
    channel: 'DTC',
    status: 'active',
    risk: 'healthy',
    carrier: 'DPD / DHL',
    serviceLevel: 'Tracked next working day',
    cutoffTime: '15:00',
    transitDays: 'Next working day after dispatch',
    surcharge: 7.5,
    eligiblePlants: ['Sidcup shop', 'Trade supplier'],
    owner: 'Dispatch team',
    notes: 'Default paid UK parcel route for most print products once production is complete.',
    enabled: true,
    showAtCheckout: true,
    publicLabel: 'Next working day delivery',
    checkoutDescription: 'Tracked next working day delivery after artwork approval and production completion.',
    fulfilmentMode: 'delivery',
    zoneType: 'uk-mainland',
    zoneName: 'UK mainland',
    postcodeRules: 'UK mainland excluding remote/manual quote zones',
    pricingBasis: 'free-over-threshold',
    basePriceMinor: 750,
    freeAboveMinor: 10000,
    productionBufferDays: 0,
    sameDayEligible: false,
    nextDayEligible: true,
    requiresManualApproval: false,
    sortOrder: 30,
    taxClass: 'standard'
  },
  {
    id: 'delivery-bulk-freight',
    name: 'Bulk Freight / Pallet',
    channel: 'B2B',
    status: 'pilot',
    risk: 'watch',
    carrier: 'Palletline / manual carrier',
    serviceLevel: 'Freight quote',
    cutoffTime: '13:00',
    transitDays: '1-3 working days',
    surcharge: 35,
    eligiblePlants: ['Trade supplier', 'Warehouse'],
    owner: 'Production manager',
    notes: 'Use for large board, signage, exhibition, packaging and heavy trade orders that need manual dispatch review.',
    enabled: true,
    showAtCheckout: false,
    publicLabel: 'Freight delivery quote',
    checkoutDescription: 'Large or heavy jobs may require a manual freight quotation before payment.',
    fulfilmentMode: 'freight',
    zoneType: 'manual',
    zoneName: 'Manual freight zones',
    postcodeRules: 'Remote areas, oversized boards, pallets and manual quote orders',
    pricingBasis: 'manual-quote',
    basePriceMinor: 3500,
    freeAboveMinor: undefined,
    productionBufferDays: 1,
    sameDayEligible: false,
    nextDayEligible: false,
    requiresManualApproval: true,
    sortOrder: 40,
    taxClass: 'standard'
  }
];
