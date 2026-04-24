export type PrinterStatus = 'online' | 'maintenance' | 'offline' | 'queued';
export type PrinterRisk = 'low' | 'watch' | 'critical';
export type PrinterTechnology = 'Digital' | 'Large Format' | 'Finishing' | 'Hybrid';

export type PrinterFleetRecord = {
  id: string;
  name: string;
  plant: string;
  status: PrinterStatus;
  risk: PrinterRisk;
  technology: PrinterTechnology;
  queueJobs: number;
  utilisation: number;
  operator: string;
  lastService: string;
  makeModel: string;
  notes: string;
};

export const printerFleetMock: PrinterFleetRecord[] = [
  {
    id: 'pr-1001',
    name: 'HP Indigo 7K',
    plant: 'London',
    status: 'online',
    risk: 'low',
    technology: 'Digital',
    queueJobs: 8,
    utilisation: 74,
    operator: 'Maya Singh',
    lastService: '2026-04-02',
    makeModel: 'HP Indigo 7K Press',
    notes: 'Primary short-run colour engine. Healthy output and stable calibration.'
  },
  {
    id: 'pr-1002',
    name: 'Zünd Cutter G3',
    plant: 'Manchester',
    status: 'maintenance',
    risk: 'watch',
    technology: 'Finishing',
    queueJobs: 5,
    utilisation: 41,
    operator: 'Tom Hargreaves',
    lastService: '2026-04-10',
    makeModel: 'Zünd G3 L-3200',
    notes: 'Scheduled blade and sensor maintenance before high-volume signage work.'
  },
  {
    id: 'pr-1003',
    name: 'EFI VUTEk Q5r',
    plant: 'Birmingham',
    status: 'queued',
    risk: 'watch',
    technology: 'Large Format',
    queueJobs: 13,
    utilisation: 88,
    operator: 'Nadia Barnes',
    lastService: '2026-03-26',
    makeModel: 'EFI VUTEk Q5r',
    notes: 'Large-format backlog building. Route urgent banner work carefully.'
  },
  {
    id: 'pr-1004',
    name: 'Konica AccurioPress C14000',
    plant: 'Leeds',
    status: 'offline',
    risk: 'critical',
    technology: 'Digital',
    queueJobs: 9,
    utilisation: 0,
    operator: 'Luca Evans',
    lastService: '2026-03-18',
    makeModel: 'Konica Minolta AccurioPress C14000',
    notes: 'Unexpected downtime. High-SLA leaflet work should be rerouted until engineer sign-off.'
  },
  {
    id: 'pr-1005',
    name: 'Canon Colorado M5W',
    plant: 'London',
    status: 'online',
    risk: 'low',
    technology: 'Hybrid',
    queueJobs: 4,
    utilisation: 57,
    operator: 'Ari Patel',
    lastService: '2026-04-05',
    makeModel: 'Canon Colorado M5W',
    notes: 'Flexible for retail POS and short window-graphic turnaround.'
  }
];
