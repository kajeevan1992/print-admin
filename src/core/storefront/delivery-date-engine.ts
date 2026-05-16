export type DeliveryDateInput = { product?: Record<string, any>; option?: Record<string, any>; now?: Date | string };

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

function asArray<T = any>(...values: any[]): T[] {
  for (const value of values) if (Array.isArray(value) && value.length) return value as T[];
  return [];
}

function toDate(value?: Date | string) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function pad(value: number) { return String(value).padStart(2, '0'); }
function isoDate(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }

function cutoff(value?: string) {
  const [h, m] = String(value || '13:00').split(':');
  const hour = Math.max(0, Math.min(23, Number(h) || 0));
  const minute = Math.max(0, Math.min(59, Number(m) || 0));
  return { hour, minute, text: `${pad(hour)}:${pad(minute)}` };
}

function settings(product: Record<string, any> = {}, option: Record<string, any> = {}) {
  const meta = product.metadataJson || {};
  const delivery = product.delivery || meta.delivery || {};
  const cfg = delivery.settings || delivery.deliverySettings || meta.deliverySettings || {};
  const calendar = delivery.calendar || meta.deliveryCalendar || meta.productionCalendar || {};
  const om = option.storefrontMeta || option.metadata || option.meta || {};
  return {
    cutoffTime: option.cutoffTime || om.cutoffTime || cfg.cutoffTime || calendar.cutoffTime || delivery.cutoffTime || '13:00',
    timezone: option.timezone || om.timezone || cfg.timezone || calendar.timezone || delivery.timezone || 'Europe/London',
    workingDays: asArray(option.workingDays, om.workingDays, cfg.workingDays, calendar.workingDays, delivery.workingDays, DEFAULT_WORKING_DAYS).map(Number),
    closedDates: new Set(asArray(option.closedDates, om.closedDates, cfg.closedDates, calendar.closedDates, delivery.closedDates).map((value) => String(value).slice(0, 10))),
    sameDayDispatch: option.sameDayDispatch ?? om.sameDayDispatch ?? cfg.sameDayDispatch ?? calendar.sameDayDispatch ?? delivery.sameDayDispatch ?? true,
    dispatchDayOffset: Number(option.dispatchDayOffset ?? om.dispatchDayOffset ?? cfg.dispatchDayOffset ?? calendar.dispatchDayOffset ?? 0) || 0,
    carrierDays: Number(option.carrierDays ?? om.carrierDays ?? cfg.carrierDays ?? calendar.carrierDays ?? delivery.carrierDays ?? 1) || 0,
  };
}

function startOfDay(date: Date) { const next = new Date(date.getTime()); next.setHours(0, 0, 0, 0); return next; }
function isWorkingDay(date: Date, cfg: ReturnType<typeof settings>) { return (cfg.workingDays.length ? cfg.workingDays : DEFAULT_WORKING_DAYS).includes(date.getDay()) && !cfg.closedDates.has(isoDate(date)); }
function nextWorkingDay(date: Date, cfg: ReturnType<typeof settings>) { const next = startOfDay(date); while (!isWorkingDay(next, cfg)) next.setDate(next.getDate() + 1); return next; }
function addWorkingDays(date: Date, days: number, cfg: ReturnType<typeof settings>) { let left = Math.max(0, Number(days) || 0); let cursor = isWorkingDay(date, cfg) ? startOfDay(date) : nextWorkingDay(date, cfg); while (left > 0) { cursor.setDate(cursor.getDate() + 1); if (isWorkingDay(cursor, cfg)) left -= 1; } return cursor; }
function afterCutoff(now: Date, cutoffTime: string) { const c = cutoff(cutoffTime); const d = new Date(now.getTime()); d.setHours(c.hour, c.minute, 0, 0); return now.getTime() > d.getTime(); }

function serviceDays(option: Record<string, any> = {}) {
  const meta = option.storefrontMeta || option.metadata || option.meta || {};
  const exact = option.businessDays ?? option.productionDays ?? option.days ?? meta.businessDays ?? meta.productionDays;
  const min = option.businessDaysMin ?? option.productionDaysMin ?? meta.businessDaysMin ?? meta.productionDaysMin;
  const max = option.businessDaysMax ?? option.productionDaysMax ?? meta.businessDaysMax ?? meta.productionDaysMax;
  if (exact !== undefined && exact !== null && exact !== '') return { min: Number(exact) || 0, max: Number(exact) || 0 };
  if (min !== undefined || max !== undefined) return { min: Number(min ?? max) || 0, max: Number(max ?? min) || 0 };
  const text = `${option.value || ''} ${option.label || ''} ${option.name || ''}`.toLowerCase();
  if (text.includes('same day')) return { min: 0, max: 0 };
  if (text.includes('express')) return { min: 1, max: 1 };
  const number = Number((text.match(/\d+/) || [])[0] || 0);
  return { min: number, max: number };
}

function humanDate(date: Date) { return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date); }

export function calculateDeliveryEstimate(input: DeliveryDateInput = {}) {
  const now = toDate(input.now);
  const option = input.option || {};
  const cfg = settings(input.product || {}, option);
  const c = cutoff(cfg.cutoffTime);
  const missedCutoff = afterCutoff(now, c.text);
  const start = isWorkingDay(now, cfg) && !missedCutoff ? startOfDay(now) : addWorkingDays(now, 1, cfg);
  const days = serviceDays(option);
  const extra = cfg.sameDayDispatch === false ? 1 : 0;
  const minDays = Math.max(0, days.min + cfg.dispatchDayOffset + extra);
  const maxDays = Math.max(minDays, days.max + cfg.dispatchDayOffset + extra);
  const dispatchMin = addWorkingDays(start, minDays, cfg);
  const dispatchMax = addWorkingDays(start, maxDays, cfg);
  const deliveryMin = addWorkingDays(dispatchMin, cfg.carrierDays, cfg);
  const deliveryMax = addWorkingDays(dispatchMax, cfg.carrierDays, cfg);
  const deliveryDisplay = isoDate(deliveryMin) === isoDate(deliveryMax) ? humanDate(deliveryMin) : `${humanDate(deliveryMin)} - ${humanDate(deliveryMax)}`;
  const dispatchDisplay = isoDate(dispatchMin) === isoDate(dispatchMax) ? humanDate(dispatchMin) : `${humanDate(dispatchMin)} - ${humanDate(dispatchMax)}`;
  const cutoffMessage = missedCutoff ? 'Cut-off passed. Dispatch moves to the next available working day.' : `Order before ${c.text} for earliest dispatch.`;
  return { cutoffTime: c.text, timezone: cfg.timezone, missedCutoff, sameDayDispatch: cfg.sameDayDispatch !== false, productionDaysMin: days.min, productionDaysMax: days.max, carrierDays: cfg.carrierDays, estimatedDispatchDate: isoDate(dispatchMin), estimatedDispatchDateMax: isoDate(dispatchMax), estimatedDeliveryDate: isoDate(deliveryMin), estimatedDeliveryDateMax: isoDate(deliveryMax), dispatchDisplay, deliveryDisplay, cutoffMessage, displayText: `${cutoffMessage} Estimated delivery ${deliveryDisplay}.` };
}

export function enrichDeliveryOptionWithEstimate(product: Record<string, any>, option: Record<string, any>, now?: Date | string) {
  const estimate = calculateDeliveryEstimate({ product, option, now });
  return { ...option, cutoffTime: option.cutoffTime || estimate.cutoffTime, cutoffMessage: option.cutoffMessage || estimate.cutoffMessage, estimatedDispatchDate: option.estimatedDispatchDate || estimate.estimatedDispatchDate, estimatedDispatchDateMax: option.estimatedDispatchDateMax || estimate.estimatedDispatchDateMax, estimatedDeliveryDate: option.estimatedDeliveryDate || estimate.estimatedDeliveryDate, estimatedDeliveryDateMax: option.estimatedDeliveryDateMax || estimate.estimatedDeliveryDateMax, dispatchDisplay: option.dispatchDisplay || estimate.dispatchDisplay, deliveryDisplay: option.deliveryDisplay || estimate.deliveryDisplay, description: option.description || estimate.displayText, deliveryEstimate: estimate };
}
