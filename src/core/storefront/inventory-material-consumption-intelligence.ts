import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getProductionImpositionIntelligence } from '@/core/storefront/production-imposition-intelligence';
import { getProductionCostingIntelligence } from '@/core/storefront/production-costing-intelligence';

/**
 * v324 Unified Inventory + Material Consumption Intelligence
 *
 * Reuses live internal systems:
 * - Internal catalog material records when available
 * - Planner jobs/lanes/sheet counts/runtime
 * - Production Board workflow state
 * - v318 imposition/waste intelligence
 * - v319 costing intelligence
 *
 * This is not a demo stock page. It is the material reservation, consumption,
 * replenishment and compatibility intelligence layer for the existing production core.
 */

type Store = Record<string, any>;

const CONFIG_RESOURCE = 'admin-config' as any;
const INVENTORY_KEY = 'storefront-inventory-material-ledger';
const MATERIAL_RECORD_KEYS = ['materials', 'catalog-materials', 'storefront-materials', 'admin_materials_store'];

const DEFAULT_MATERIALS = [
  { id: 'mat-sra3-silk-350', name: 'SRA3 350gsm Silk', type: 'sheet', format: 'SRA3', stockKey: 'silk-stock', onHandSheets: 2500, reorderPointSheets: 500, unitCostMinor: 18, compatibleMachines: ['Digital Press 01', 'Ricoh Pro C5400s', 'SRA3 Digital'] },
  { id: 'mat-sra3-matt-170', name: 'SRA3 170gsm Matt', type: 'sheet', format: 'SRA3', stockKey: 'matt-stock', onHandSheets: 4000, reorderPointSheets: 800, unitCostMinor: 12, compatibleMachines: ['Digital Press 01', 'Ricoh Pro C5400s', 'SRA3 Digital'] },
  { id: 'mat-pvc-1200', name: 'PVC Banner Roll 1200mm', type: 'roll', rollWidthMm: 1200, rollLengthM: 50, remainingLengthM: 38, stockKey: 'pvc-roll', unitCostMinor: 450, compatibleMachines: ['Roll-to-roll Latex', 'Large Format'] },
  { id: 'mat-vinyl-1370', name: 'Vinyl Roll 1370mm', type: 'roll', rollWidthMm: 1370, rollLengthM: 50, remainingLengthM: 42, stockKey: 'vinyl-roll', unitCostMinor: 520, compatibleMachines: ['Roll-to-roll Latex', 'Large Format'] },
  { id: 'mat-foamex-8x4', name: 'Foamex Board 8x4', type: 'board', boardSize: '8x4', stockKey: 'rigid-board', onHandBoards: 80, reorderPointBoards: 15, unitCostMinor: 650, compatibleMachines: ['Flatbed', 'Large Format'] }
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value: unknown) {
  return String(value || '').toLowerCase();
}

function productText(job: Store) {
  return `${job.product || ''} ${job.productName || ''} ${job.productSlug || ''} ${job.title || ''} ${job.productionNotes || ''}`.toLowerCase();
}

function classifyMedia(job: Store) {
  const text = productText(job);
  if (text.includes('banner') || text.includes('pvc') || text.includes('roll') || text.includes('vinyl')) return 'roll';
  if (text.includes('board') || text.includes('foamex') || text.includes('dibond')) return 'board';
  return 'sheet';
}

function stockKey(job: Store) {
  const text = productText(job);
  if (text.includes('soft touch')) return 'soft-touch-stock';
  if (text.includes('matt')) return 'matt-stock';
  if (text.includes('silk')) return 'silk-stock';
  if (text.includes('gloss')) return 'gloss-stock';
  if (text.includes('banner') || text.includes('pvc')) return 'pvc-roll';
  if (text.includes('vinyl')) return 'vinyl-roll';
  if (text.includes('board') || text.includes('foamex') || text.includes('dibond')) return 'rigid-board';
  return 'standard-stock';
}

function quantityFor(job: Store) {
  return Math.max(1, asNumber(job.quantity || job.payload?.quantity || job.items?.[0]?.quantity, 250));
}

function yieldFor(job: Store) {
  const explicit = asNumber(job.sra3Yield, 0);
  if (explicit > 0) return explicit;
  const text = productText(job);
  if (text.includes('business')) return 21;
  if (text.includes('a5')) return 4;
  if (text.includes('a4')) return 2;
  return 1;
}

function sheetCount(job: Store) {
  const explicit = asNumber(job.sra3Sheets, 0);
  if (explicit > 0) return explicit;
  return Math.max(1, Math.ceil(quantityFor(job) / yieldFor(job)));
}

async function readConfigList(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const meta = (record as any)?.metadataJson || {};
    if (Array.isArray(meta.items)) return meta.items;
    if (Array.isArray(meta.store?.items)) return meta.store.items;
    if (Array.isArray(meta.data)) return meta.data;
  } catch {
    return [];
  }
  return [];
}

async function readMaterials(request: Request) {
  for (const key of MATERIAL_RECORD_KEYS) {
    const rows = await readConfigList(request, key);
    if (rows.length) return rows;
  }
  return DEFAULT_MATERIALS;
}

async function readInventoryLedger(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, INVENTORY_KEY);
    const store = (record as any)?.metadataJson?.store || {};
    return {
      reservations: Array.isArray(store.reservations) ? store.reservations : [],
      consumptions: Array.isArray(store.consumptions) ? store.consumptions : [],
      adjustments: Array.isArray(store.adjustments) ? store.adjustments : [],
      replenishments: Array.isArray(store.replenishments) ? store.replenishments : []
    };
  } catch {
    return { reservations: [], consumptions: [], adjustments: [], replenishments: [] };
  }
}

async function saveInventoryLedger(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: INVENTORY_KEY,
    slug: INVENTORY_KEY,
    name: 'Inventory material ledger',
    description: 'Live reservations, consumption, adjustments and replenishment events for production materials.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: INVENTORY_KEY,
      source: 'InventoryMaterialConsumptionIntelligence'
    }
  } as any);
}

function materialMatchesJob(material: Store, job: Store) {
  const key = stockKey(job);
  const materialKey = cleanText(material.stockKey || material.name || material.format);
  if (materialKey.includes(key)) return true;
  if (key === 'standard-stock' && cleanText(material.type) === 'sheet') return true;
  if (classifyMedia(job) === 'roll' && cleanText(material.type) === 'roll') return true;
  if (classifyMedia(job) === 'board' && cleanText(material.type) === 'board') return true;
  return false;
}

function compatibleWithMachine(material: Store, job: Store) {
  const machine = cleanText(job.laneName || job.machineName || job.plant);
  const compatible = Array.isArray(material.compatibleMachines) ? material.compatibleMachines.map(cleanText) : [];
  if (!compatible.length || !machine) return true;
  return compatible.some((item: string) => machine.includes(item) || item.includes(machine));
}

function findMaterial(materials: Store[], job: Store) {
  return materials.find((material) => materialMatchesJob(material, job) && compatibleWithMachine(material, job)) || materials.find((material) => materialMatchesJob(material, job)) || materials[0];
}

function estimateUsage(job: Store, material: Store, imposition: Store) {
  const media = classifyMedia(job);
  const group = Array.isArray(imposition.gangRunGroups)
    ? imposition.gangRunGroups.find((item: Store) => Array.isArray(item.orderNumbers) && item.orderNumbers.includes(job.orderNumber))
    : null;
  const share = group ? 1 / Math.max(1, asNumber(group.jobCount, 1)) : 1;
  const savedSheets = group ? Math.floor(asNumber(group.savedSheets, 0) * share) : 0;
  const wasteSheets = group ? Math.ceil(asNumber(group.wasteSlots, 0) * share / Math.max(1, asNumber(group.sra3Yield, 1))) : 0;

  if (media === 'roll') {
    const estimatedLengthM = Math.max(1, Math.ceil(quantityFor(job) / 10));
    return { unit: 'm', required: estimatedLengthM, reserved: estimatedLengthM, waste: 0, saved: 0, basis: 'roll-length-estimate' };
  }
  if (media === 'board') {
    const boards = Math.max(1, Math.ceil(quantityFor(job) / 2));
    return { unit: 'boards', required: boards, reserved: boards, waste: 0, saved: 0, basis: 'board-count-estimate' };
  }
  const requiredSheets = Math.max(1, sheetCount(job) - savedSheets + wasteSheets);
  return { unit: 'sheets', required: requiredSheets, reserved: requiredSheets, waste: wasteSheets, saved: savedSheets, basis: group ? 'gang-run-imposition' : 'sra-sheet-estimate' };
}

function availableFor(material: Store, ledger: Store, unit: string) {
  const reserved = ledger.reservations
    .filter((item: Store) => cleanText(item.materialId) === cleanText(material.id) && item.status !== 'released')
    .reduce((sum: number, item: Store) => sum + asNumber(item.quantity, 0), 0);
  const consumed = ledger.consumptions
    .filter((item: Store) => cleanText(item.materialId) === cleanText(material.id))
    .reduce((sum: number, item: Store) => sum + asNumber(item.quantity, 0), 0);
  const adjusted = ledger.adjustments
    .filter((item: Store) => cleanText(item.materialId) === cleanText(material.id))
    .reduce((sum: number, item: Store) => sum + asNumber(item.quantity, 0), 0);
  const replenished = ledger.replenishments
    .filter((item: Store) => cleanText(item.materialId) === cleanText(material.id))
    .reduce((sum: number, item: Store) => sum + asNumber(item.quantity, 0), 0);

  const onHand = unit === 'm'
    ? asNumber(material.remainingLengthM ?? material.rollLengthM, 0)
    : unit === 'boards'
      ? asNumber(material.onHandBoards, 0)
      : asNumber(material.onHandSheets, 0);

  return Math.max(0, onHand + replenished + adjusted - reserved - consumed);
}

function reorderPoint(material: Store, unit: string) {
  if (unit === 'm') return asNumber(material.reorderPointM, Math.max(5, asNumber(material.rollLengthM, 50) * 0.15));
  if (unit === 'boards') return asNumber(material.reorderPointBoards, 10);
  return asNumber(material.reorderPointSheets, 250);
}

function buildMaterialConsumption(planner: Store, board: Store, materials: Store[], imposition: Store, ledger: Store) {
  const plannerJobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  const boardItems = Array.isArray(board.items) ? board.items : [];
  const boardByOrder = new Map(boardItems.map((job: Store) => [cleanText(job.orderNumber), job]));

  return plannerJobs.map((job: Store) => {
    const boardJob = boardByOrder.get(cleanText(job.orderNumber)) || {};
    const merged = { ...job, ...boardJob };
    const material = findMaterial(materials, merged) || {};
    const usage = estimateUsage(merged, material, imposition);
    const available = availableFor(material, ledger, usage.unit);
    const afterReservation = Math.max(0, available - usage.reserved);
    const reorder = reorderPoint(material, usage.unit);
    const shortage = usage.reserved > available;

    return {
      id: `usage-${job.id}`,
      jobId: job.id,
      boardJobId: boardJob.id || null,
      orderNumber: job.orderNumber,
      product: job.productName || boardJob.product || job.productSlug || 'Print job',
      materialId: material.id || null,
      materialName: material.name || 'Unmatched material',
      materialType: material.type || classifyMedia(merged),
      stockKey: material.stockKey || stockKey(merged),
      unit: usage.unit,
      requiredQuantity: usage.required,
      reservedQuantity: usage.reserved,
      wasteQuantity: usage.waste,
      savedQuantity: usage.saved,
      availableBeforeReservation: available,
      projectedAfterReservation: afterReservation,
      reorderPoint: reorder,
      shortage,
      lowStockAfterReservation: afterReservation <= reorder,
      consumptionBasis: usage.basis,
      machineCompatible: compatibleWithMachine(material, merged),
      productionBlocked: boardJob.handoffState === 'blocked' || boardJob.preflightStatus === 'fail'
    };
  });
}

function buildMaterialBalances(materials: Store[], consumption: Store[], ledger: Store) {
  return materials.map((material) => {
    const rows = consumption.filter((row) => cleanText(row.materialId) === cleanText(material.id));
    const unit = rows[0]?.unit || (material.type === 'roll' ? 'm' : material.type === 'board' ? 'boards' : 'sheets');
    const available = availableFor(material, ledger, unit);
    const reserved = rows.reduce((sum, row) => sum + asNumber(row.reservedQuantity, 0), 0);
    const required = rows.reduce((sum, row) => sum + asNumber(row.requiredQuantity, 0), 0);
    const waste = rows.reduce((sum, row) => sum + asNumber(row.wasteQuantity, 0), 0);
    const saved = rows.reduce((sum, row) => sum + asNumber(row.savedQuantity, 0), 0);
    const projected = Math.max(0, available - reserved);
    const reorder = reorderPoint(material, unit);
    return {
      id: material.id,
      name: material.name,
      type: material.type,
      unit,
      availableQuantity: available,
      reservedQuantity: reserved,
      requiredQuantity: required,
      projectedQuantity: projected,
      wasteQuantity: waste,
      savedQuantity: saved,
      reorderPoint: reorder,
      lowStock: projected <= reorder,
      shortage: reserved > available,
      compatibleMachines: material.compatibleMachines || [],
      unitCostMinor: asNumber(material.unitCostMinor, 0),
      projectedValueMinor: Math.round(projected * asNumber(material.unitCostMinor, 0))
    };
  });
}

function buildLowStockAlerts(balances: Store[]) {
  return balances
    .filter((balance) => balance.lowStock || balance.shortage)
    .map((balance) => ({
      id: `stock-alert-${balance.id}`,
      severity: balance.shortage ? 'critical' : 'warning',
      materialId: balance.id,
      materialName: balance.name,
      unit: balance.unit,
      projectedQuantity: balance.projectedQuantity,
      reorderPoint: balance.reorderPoint,
      message: balance.shortage
        ? `${balance.name} has a projected shortage for scheduled production.`
        : `${balance.name} is projected below reorder point after reservations.`
    }));
}

function buildReplenishmentPlan(alerts: Store[], balances: Store[]) {
  return alerts.map((alert) => {
    const balance = balances.find((item) => item.id === alert.materialId) || {};
    const target = Math.max(asNumber(balance.reorderPoint, 0) * 3, asNumber(balance.requiredQuantity, 0) * 1.25);
    const orderQuantity = Math.max(0, Math.ceil(target - asNumber(balance.projectedQuantity, 0)));
    return {
      id: `replenish-${alert.materialId}`,
      materialId: alert.materialId,
      materialName: alert.materialName,
      unit: alert.unit,
      suggestedOrderQuantity: orderQuantity,
      estimatedCostMinor: Math.round(orderQuantity * asNumber(balance.unitCostMinor, 0)),
      priority: alert.severity === 'critical' ? 'urgent' : 'normal',
      reason: alert.message
    };
  });
}

function buildConsumableUsage(consumption: Store[]) {
  const finishingRows = consumption.filter((row) => cleanText(row.product).includes('laminat') || cleanText(row.product).includes('booklet') || cleanText(row.product).includes('foil') || cleanText(row.product).includes('uv'));
  return [
    { id: 'consumable-toner-clicks', name: 'Digital press clicks/toner', unit: 'clicks', estimatedQuantity: consumption.reduce((sum, row) => sum + asNumber(row.requiredQuantity, 0), 0), source: 'sheet-production' },
    { id: 'consumable-lamination-film', name: 'Lamination film', unit: 'sheets', estimatedQuantity: finishingRows.filter((row) => cleanText(row.product).includes('laminat')).reduce((sum, row) => sum + asNumber(row.requiredQuantity, 0), 0), source: 'finishing' },
    { id: 'consumable-booklet-wire-staples', name: 'Booklet staples/wire', unit: 'sets', estimatedQuantity: finishingRows.filter((row) => cleanText(row.product).includes('booklet')).length, source: 'finishing' },
    { id: 'consumable-foil-film', name: 'Foil film', unit: 'jobs', estimatedQuantity: finishingRows.filter((row) => cleanText(row.product).includes('foil')).length, source: 'finishing' }
  ];
}

function buildSupplierIntelligence(replenishment: Store[], costing: Store) {
  const supplierComparison = Array.isArray(costing.supplierComparison) ? costing.supplierComparison : [];
  return {
    replenishment,
    supplierCostPressure: supplierComparison.filter((row: Store) => row.cheaperSource === 'supplier').length,
    recommendation: replenishment.some((row) => row.priority === 'urgent')
      ? 'Place urgent material replenishment before accepting more production on affected stock.'
      : supplierComparison.some((row: Store) => row.cheaperSource === 'supplier')
        ? 'Supplier route may protect capacity or stock on selected jobs.'
        : 'Internal production stock levels are manageable for current schedule.'
  };
}

export async function getInventoryMaterialConsumptionIntelligence(request: Request) {
  const [planner, board, materials, ledger, imposition, costing] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    readMaterials(request),
    readInventoryLedger(request),
    getProductionImpositionIntelligence(request),
    getProductionCostingIntelligence(request)
  ]);

  const consumption = buildMaterialConsumption(planner, board, materials, imposition, ledger);
  const balances = buildMaterialBalances(materials, consumption, ledger);
  const lowStockAlerts = buildLowStockAlerts(balances);
  const replenishmentPlan = buildReplenishmentPlan(lowStockAlerts, balances);
  const consumables = buildConsumableUsage(consumption);
  const supplierIntelligence = buildSupplierIntelligence(replenishmentPlan, costing);

  return {
    materials,
    ledger,
    consumption,
    balances,
    lowStockAlerts,
    replenishmentPlan,
    consumables,
    supplierIntelligence,
    summary: {
      materials: materials.length,
      scheduledJobs: consumption.length,
      reservations: ledger.reservations.length,
      consumptions: ledger.consumptions.length,
      lowStockAlerts: lowStockAlerts.length,
      shortages: balances.filter((row) => row.shortage).length,
      replenishmentItems: replenishmentPlan.length,
      totalProjectedStockValueMinor: balances.reduce((sum, row) => sum + asNumber(row.projectedValueMinor, 0), 0),
      totalWasteQuantity: consumption.reduce((sum, row) => sum + asNumber(row.wasteQuantity, 0), 0),
      totalSavedQuantity: consumption.reduce((sum, row) => sum + asNumber(row.savedQuantity, 0), 0)
    },
    source: 'internal-inventory-material-consumption-intelligence',
    generatedAt: nowIso()
  };
}

export async function reserveProductionMaterials(request: Request, input: Store) {
  const intelligence = await getInventoryMaterialConsumptionIntelligence(request);
  const ledger = await readInventoryLedger(request);
  const rows = Array.isArray(input.items) && input.items.length
    ? input.items
    : intelligence.consumption.filter((row: Store) => !input.orderNumber || cleanText(row.orderNumber) === cleanText(input.orderNumber));

  const reservations = rows.map((row: Store) => ({
    id: makeId('material-reservation'),
    materialId: row.materialId,
    materialName: row.materialName,
    orderNumber: row.orderNumber,
    jobId: row.jobId,
    quantity: asNumber(row.reservedQuantity || row.quantity, 0),
    unit: row.unit,
    status: 'reserved',
    at: nowIso(),
    source: 'inventory-material-consumption-intelligence'
  }));

  await saveInventoryLedger(request, { ...ledger, reservations: [...reservations, ...ledger.reservations].slice(0, 800) });
  await recordInventoryBoardAction(request, 'material-reserved', rows[0], `${reservations.length} material reservation(s) created.`);
  return getInventoryMaterialConsumptionIntelligence(request);
}

export async function consumeProductionMaterials(request: Request, input: Store) {
  const intelligence = await getInventoryMaterialConsumptionIntelligence(request);
  const ledger = await readInventoryLedger(request);
  const rows = Array.isArray(input.items) && input.items.length
    ? input.items
    : intelligence.consumption.filter((row: Store) => !input.orderNumber || cleanText(row.orderNumber) === cleanText(input.orderNumber));

  const consumptions = rows.map((row: Store) => ({
    id: makeId('material-consumption'),
    materialId: row.materialId,
    materialName: row.materialName,
    orderNumber: row.orderNumber,
    jobId: row.jobId,
    quantity: asNumber(row.requiredQuantity || row.quantity, 0),
    wasteQuantity: asNumber(row.wasteQuantity, 0),
    unit: row.unit,
    at: nowIso(),
    source: 'inventory-material-consumption-intelligence'
  }));

  const reservations = ledger.reservations.map((reservation: Store) => {
    const consumed = consumptions.some((item: Store) => cleanText(item.orderNumber) === cleanText(reservation.orderNumber) && cleanText(item.materialId) === cleanText(reservation.materialId));
    return consumed ? { ...reservation, status: 'consumed', consumedAt: nowIso() } : reservation;
  });

  await saveInventoryLedger(request, { ...ledger, reservations, consumptions: [...consumptions, ...ledger.consumptions].slice(0, 800) });
  await recordInventoryBoardAction(request, 'material-consumed', rows[0], `${consumptions.length} material consumption record(s) posted.`);
  return getInventoryMaterialConsumptionIntelligence(request);
}

export async function recordMaterialAdjustment(request: Request, input: Store) {
  const ledger = await readInventoryLedger(request);
  const adjustment = {
    id: makeId('material-adjustment'),
    materialId: input.materialId,
    materialName: input.materialName || null,
    quantity: asNumber(input.quantity, 0),
    unit: input.unit || 'sheets',
    reason: input.reason || 'Manual stock adjustment',
    at: nowIso(),
    operator: input.operator || null,
    source: 'inventory-material-consumption-intelligence'
  };
  await saveInventoryLedger(request, { ...ledger, adjustments: [adjustment, ...ledger.adjustments].slice(0, 500) });
  return getInventoryMaterialConsumptionIntelligence(request);
}

export async function recordMaterialReplenishment(request: Request, input: Store) {
  const ledger = await readInventoryLedger(request);
  const replenishment = {
    id: makeId('material-replenishment'),
    materialId: input.materialId,
    materialName: input.materialName || null,
    quantity: asNumber(input.quantity, 0),
    unit: input.unit || 'sheets',
    supplier: input.supplier || null,
    costMinor: asNumber(input.costMinor, 0),
    at: nowIso(),
    operator: input.operator || null,
    source: 'inventory-material-consumption-intelligence'
  };
  await saveInventoryLedger(request, { ...ledger, replenishments: [replenishment, ...ledger.replenishments].slice(0, 500) });
  return getInventoryMaterialConsumptionIntelligence(request);
}

async function recordInventoryBoardAction(request: Request, action: string, row: Store, note: string) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('inventory-action'),
    action,
    at: nowIso(),
    note,
    jobId: row?.jobId || null,
    orderNumber: row?.orderNumber || null,
    materialId: row?.materialId || null,
    source: 'inventory-material-consumption-intelligence'
  }, ...board.actions].slice(0, 400);
  await saveProductionBoardStore(request, { items: board.items, actions });
}
