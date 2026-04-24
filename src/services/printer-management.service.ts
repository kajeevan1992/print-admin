import { printerFleetMock, type PrinterFleetRecord } from '@/data/printer-management';

const KEY = 'admin_printer_fleet_store';
const LIVE_ENDPOINT = '/api/internal/catalog/printer-profiles';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

async function liveJson(endpoint: string, init?: RequestInit) {
  if (typeof window === 'undefined') return null;
  const res = await fetch(endpoint, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Internal printer profiles API failed.');
  return payload;
}

function mapLivePrinter(row: any, index = 0): PrinterFleetRecord {
  const metadata = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  return {
    id: String(row.id || row.slug || `pr-${index + 1}`),
    name: String(row.name || row.title || `Printer ${index + 1}`),
    plant: String(metadata.plant || 'Main'),
    status: (metadata.status || 'online') as PrinterFleetRecord['status'],
    risk: (metadata.risk || 'low') as PrinterFleetRecord['risk'],
    technology: (metadata.technology || 'Digital') as PrinterFleetRecord['technology'],
    queueJobs: Number(metadata.queueJobs ?? 0),
    utilisation: Number(metadata.utilisation ?? 0),
    operator: String(metadata.operator || ''),
    lastService: String(metadata.lastService || ''),
    makeModel: String(metadata.makeModel || ''),
    notes: String(row.description || metadata.notes || ''),
  };
}

function livePayload(printer: PrinterFleetRecord) {
  return {
    id: printer.id,
    slug: slugify(printer.name, printer.id),
    name: printer.name,
    title: printer.name,
    description: printer.notes,
    metadataJson: {
      recordType: 'printer-profile',
      plant: printer.plant,
      status: printer.status,
      risk: printer.risk,
      technology: printer.technology,
      queueJobs: printer.queueJobs,
      utilisation: printer.utilisation,
      operator: printer.operator,
      lastService: printer.lastService,
      makeModel: printer.makeModel,
      notes: printer.notes,
    },
  };
}

async function tryLiveFleet(): Promise<PrinterFleetRecord[] | null> {
  try {
    const payload = await liveJson(LIVE_ENDPOINT, { cache: 'no-store' });
    const raw = payload?.data?.items || payload?.data || [];
    if (!Array.isArray(raw)) return null;
    return raw.map(mapLivePrinter);
  } catch {
    return null;
  }
}

async function writeLivePrinter(printer: PrinterFleetRecord) {
  const payload = await liveJson(LIVE_ENDPOINT, {
    method: printer.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(livePayload(printer)),
  });
  return mapLivePrinter(payload?.data || livePayload(printer));
}

async function deleteLivePrinter(id: string) {
  await liveJson(`${LIVE_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const printerManagementService = {
  getFleet: async (): Promise<PrinterFleetRecord[]> => {
    const live = await tryLiveFleet();
    if (live) return live;
    return load(KEY, printerFleetMock);
  },
  savePrinter: async (printer: PrinterFleetRecord) => {
    try {
      const live = await writeLivePrinter(printer);
      const items = load(KEY, printerFleetMock);
      save(KEY, items.some((item) => item.id === live.id) ? items.map((item) => (item.id === live.id ? live : item)) : [live, ...items]);
      return live;
    } catch {
      const items = load(KEY, printerFleetMock);
      const next = items.some((item) => item.id === printer.id) ? items.map((item) => (item.id === printer.id ? printer : item)) : [printer, ...items];
      save(KEY, next);
      return printer;
    }
  },
  deletePrinter: async (id: string) => {
    try { await deleteLivePrinter(id); } catch {}
    save(KEY, load(KEY, printerFleetMock).filter((item) => item.id !== id));
  },
  resetFleet: async () => save(KEY, printerFleetMock)
};
