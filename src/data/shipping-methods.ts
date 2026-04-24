export type ShippingMethodStatus = 'active' | 'pilot' | 'paused';
export type ShippingMethodChannel = 'DTC' | 'B2B' | 'Marketplace' | 'Pickup';
export type ShippingRiskBand = 'healthy' | 'watch' | 'critical';

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
};

export const shippingMethodRecordsMock: ShippingMethodRecord[] = [
  {
    id: 'sm-1001',
    name: 'Standard Parcel',
    channel: 'DTC',
    status: 'active',
    risk: 'healthy',
    carrier: 'DPD',
    serviceLevel: 'Tracked 48',
    cutoffTime: '16:00',
    transitDays: '2-3 days',
    surcharge: 0,
    eligiblePlants: ['North', 'Midlands', 'South'],
    owner: 'A. Green',
    notes: 'Primary consumer parcel route for non-rush print orders.'
  },
  {
    id: 'sm-1002',
    name: 'Express Next Day',
    channel: 'DTC',
    status: 'active',
    risk: 'watch',
    carrier: 'DHL',
    serviceLevel: 'Next Day 12:00',
    cutoffTime: '14:30',
    transitDays: 'Next day',
    surcharge: 7.5,
    eligiblePlants: ['North', 'South'],
    owner: 'L. Price',
    notes: 'Rush route with premium surcharge and tighter pack-out window.'
  },
  {
    id: 'sm-1003',
    name: 'Freight Pallet',
    channel: 'B2B',
    status: 'pilot',
    risk: 'healthy',
    carrier: 'Palletline',
    serviceLevel: 'Economy pallet',
    cutoffTime: '13:00',
    transitDays: '2 days',
    surcharge: 18,
    eligiblePlants: ['Midlands'],
    owner: 'R. Hall',
    notes: 'Used for bulk trade print dispatch and enterprise drop-ship orders.'
  },
  {
    id: 'sm-1004',
    name: 'Warehouse Pickup',
    channel: 'Pickup',
    status: 'paused',
    risk: 'critical',
    carrier: 'Internal',
    serviceLevel: 'Timed collection slot',
    cutoffTime: '12:00',
    transitDays: 'Same day',
    surcharge: 0,
    eligiblePlants: ['North'],
    owner: 'M. Reed',
    notes: 'Paused after missed customer handover windows and slot overbooking.'
  }
];
