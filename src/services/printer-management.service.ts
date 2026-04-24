import { printerFleetMock, type PrinterFleetRecord } from '@/data/printer-management';

const KEY = 'admin_printer_fleet_store';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const printerManagementService = {
  getFleet: async (): Promise<PrinterFleetRecord[]> => load(KEY, printerFleetMock),
  savePrinter: async (printer: PrinterFleetRecord) => {
    const items = load(KEY, printerFleetMock);
    const next = items.some((item) => item.id === printer.id) ? items.map((item) => (item.id === printer.id ? printer : item)) : [printer, ...items];
    save(KEY, next);
    return printer;
  },
  deletePrinter: async (id: string) => save(KEY, load(KEY, printerFleetMock).filter((item) => item.id !== id)),
  resetFleet: async () => save(KEY, printerFleetMock)
};
