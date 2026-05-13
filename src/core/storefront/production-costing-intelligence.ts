import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getProductionImpositionIntelligence } from '@/core/storefront/production-imposition-intelligence';

/**
 * v319 Production Costing + Real Margin Intelligence
 *
 * Reuses live internal production stores:
 * - Planner jobs/lanes/runtime/sheets
 * - Production board workflow/preflight/dispatch state
 * - v318 imposition/waste intelligence
 *
 * This is not a disconnected demo finance module. It is designed as the production
 * profitability layer that pricing, orders, supplier costs, and accounting can wire into.
 */

type Store = Record<string, any>;

const COST_SETTINGS = {
  currency: 'GBP',
  defaultSheetCostMinor: 18,
  defaultRollCostPerMeterMinor: 450,
  defaultBoardCostMinor: 650,
  defaultMachineMinuteCostMinor: 42,
  finishingMinuteCostMinor: 35,
  operatorMinuteCostMinor: 28,
  overheadPercent: 12,
  targetMarginPercent: 35,
  minimumMarginPercent: 22,
  wasteCostMultiplier: 1
};

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

function money(minor: number) {
  return Math.round(minor);
}

function productText(job: Store) {
  return `${job.productName || ''} ${job.productSlug || ''} ${job.product || ''} ${job.orderNumber || ''}`.toLowerCase();
}

function classifyMedia(job: Store) {
  const text = productText(job);
  if (text.includes('banner') || text.includes('pvc') || text.includes('roll') || text.includes('vinyl')) return 'roll-media';
  if (text.includes('board') || text.includes('foamex') || text.includes('dibond')) return 'rigid-board';
  return 'sheet';
}

function classifyFinishing(job: Store) {
  const text = `${productText(job)} ${job.productionNotes || ''} ${job.finish || ''}`.toLowerCase();
  const steps = [];
  if (text.includes('laminat')) steps.push('lamination');
  if (text.includes('fold')) steps.push('folding');
  if (text.includes('crease')) steps.push('creasing');
  if (text.includes('booklet') || text.includes('saddle')) steps.push('booklet-making');
  if (text.includes('spot') || text.includes('uv')) steps.push('spot-uv');
  if (text.includes('foil')) steps.push('foil');
  return steps.length ? steps : ['trim'];
}

function quantityFor(job: Store) {
  return asNumber(job.quantity || job.payload?.quantity || job.items?.[0]?.quantity, 250);
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

function sellingPriceMinor(job: Store, boardJob?: Store) {
  const direct = asNumber(job.sellPriceMinor || job.totalMinor || job.grossTotalMinor || boardJob?.sellPriceMinor || boardJob?.totalMinor, 0);
  if (direct > 0) return direct;
  const qty = quantityFor(job);
  const text = productText({ ...job, ...boardJob });
  if (text.includes('business')) return Math.max(1900, Math.round(qty * 8));
  if (text.includes('flyer') || text.includes('leaflet')) return Math.max(2900, Math.round(qty * 6));
  if (text.includes('banner')) return Math.max(4500, Math.round(qty * 120));
  return Math.max(2500, Math.round(qty * 10));
}

function materialCostMinor(job: Store, wasteSheets = 0) {
  const media = classifyMedia(job);
  if (media === 'roll-media') {
    const estimatedMeters = Math.max(1, Math.round(quantityFor(job) / 10));
    return money(estimatedMeters * COST_SETTINGS.defaultRollCostPerMeterMinor);
  }
  if (media === 'rigid-board') return money(sheetCount(job) * COST_SETTINGS.defaultBoardCostMinor);
  return money((sheetCount(job) + wasteSheets * COST_SETTINGS.wasteCostMultiplier) * COST_SETTINGS.defaultSheetCostMinor);
}

function finishingCostMinor(job: Store) {
  const steps = classifyFinishing(job);
  const sheets = sheetCount(job);
  const minutes = steps.reduce((sum, step) => {
    if (step === 'trim') return sum + Math.max(6, sheets * 0.2);
    if (step === 'lamination') return sum + Math.max(12, sheets * 0.35);
    if (step === 'folding') return sum + Math.max(10, sheets * 0.25);
    if (step === 'creasing') return sum + Math.max(10, sheets * 0.25);
    if (step === 'booklet-making') return sum + Math.max(18, sheets * 0.55);
    if (step === 'spot-uv') return sum + Math.max(20, sheets * 0.45);
    if (step === 'foil') return sum + Math.max(25, sheets * 0.5);
    return sum + 8;
  }, 0);
  return money(minutes * COST_SETTINGS.finishingMinuteCostMinor);
}

function runtimeCostMinor(job: Store, lane?: Store) {
  const minutes = asNumber(job.estimatedMinutes, Math.max(10, sheetCount(job) * 0.5));
  const rate = asNumber(lane?.machineMinuteCostMinor, COST_SETTINGS.defaultMachineMinuteCostMinor);
  return money(minutes * rate);
}

function labourCostMinor(job: Store) {
  const minutes = asNumber(job.estimatedMinutes, Math.max(10, sheetCount(job) * 0.4));
  return money(minutes * COST_SETTINGS.operatorMinuteCostMinor);
}

function overheadCostMinor(subtotal: number) {
  return money(subtotal * (COST_SETTINGS.overheadPercent / 100));
}

function marginBand(percent: number) {
  if (percent >= COST_SETTINGS.targetMarginPercent) return 'healthy';
  if (percent >= COST_SETTINGS.minimumMarginPercent) return 'watch';
  return 'underpriced';
}

function findWasteForJob(orderNumber: string, imposition: Store) {
  const groups = Array.isArray(imposition.gangRunGroups) ? imposition.gangRunGroups : [];
  const group = groups.find((item) => Array.isArray(item.orderNumbers) && item.orderNumbers.includes(orderNumber));
  if (!group) return { wasteSheets: 0, savedSheets: 0, gangRunId: null };
  const share = 1 / Math.max(1, asNumber(group.jobCount, 1));
  return {
    wasteSheets: Math.ceil(asNumber(group.wasteSlots, 0) * share / Math.max(1, asNumber(group.sra3Yield, 1))),
    savedSheets: Math.floor(asNumber(group.savedSheets, 0) * share),
    gangRunId: group.id
  };
}

function buildJobCostings(planner: Store, board: Store, imposition: Store) {
  const plannerJobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  const lanes = Array.isArray(planner.lanes) ? planner.lanes : [];
  const boardItems = Array.isArray(board.items) ? board.items : [];
  const boardByOrder = new Map(boardItems.map((job) => [String(job.orderNumber || '').toLowerCase(), job]));

  return plannerJobs.map((job) => {
    const boardJob = boardByOrder.get(String(job.orderNumber || '').toLowerCase()) || {};
    const lane = lanes.find((item) => item.id === job.laneId) || {};
    const waste = findWasteForJob(String(job.orderNumber || ''), imposition);
    const materials = materialCostMinor(job, waste.wasteSheets);
    const runtime = runtimeCostMinor(job, lane);
    const labour = labourCostMinor(job);
    const finishing = finishingCostMinor({ ...job, ...boardJob });
    const wasteCost = money(waste.wasteSheets * COST_SETTINGS.defaultSheetCostMinor);
    const subtotal = materials + runtime + labour + finishing;
    const overhead = overheadCostMinor(subtotal);
    const totalCost = subtotal + overhead;
    const sellPrice = sellingPriceMinor(job, boardJob);
    const profit = sellPrice - totalCost;
    const marginPercent = sellPrice > 0 ? Math.round((profit / sellPrice) * 1000) / 10 : 0;
    const costPerUnit = quantityFor(job) > 0 ? Math.round(totalCost / quantityFor(job)) : totalCost;

    return {
      id: `cost-${job.id}`,
      jobId: job.id,
      boardJobId: boardJob.id || null,
      orderNumber: job.orderNumber,
      customer: job.customerName || boardJob.customer || 'Storefront Customer',
      product: job.productName || boardJob.product || job.productSlug || 'Print job',
      laneId: job.laneId,
      laneName: job.laneName || lane.name || 'Unassigned',
      quantity: quantityFor(job),
      media: classifyMedia({ ...job, ...boardJob }),
      sra3Sheets: sheetCount(job),
      savedSheets: waste.savedSheets,
      wasteSheets: waste.wasteSheets,
      gangRunId: waste.gangRunId,
      sellPriceMinor: sellPrice,
      totalCostMinor: money(totalCost),
      materialCostMinor: materials,
      runtimeCostMinor: runtime,
      labourCostMinor: labour,
      finishingCostMinor: finishing,
      wasteCostMinor: wasteCost,
      overheadCostMinor: overhead,
      profitMinor: money(profit),
      marginPercent,
      marginBand: marginBand(marginPercent),
      costPerUnitMinor: costPerUnit,
      underpriced: marginPercent < COST_SETTINGS.minimumMarginPercent,
      blocker: boardJob.handoffState === 'blocked' || boardJob.preflightStatus === 'fail' ? 'workflow/preflight block' : null
    };
  }).sort((a, b) => a.marginPercent - b.marginPercent);
}

function buildSupplierComparison(jobCostings: Store[]) {
  return jobCostings.map((job) => {
    const supplierBase = Math.round(asNumber(job.materialCostMinor) * 1.35 + asNumber(job.finishingCostMinor) * 0.8);
    const supplierExpress = Math.round(supplierBase * 1.22);
    const internal = asNumber(job.totalCostMinor);
    const bestSupplier = Math.min(supplierBase, supplierExpress);
    return {
      orderNumber: job.orderNumber,
      jobId: job.jobId,
      internalCostMinor: internal,
      supplierBaseMinor: supplierBase,
      supplierExpressMinor: supplierExpress,
      bestSupplierMinor: bestSupplier,
      cheaperSource: internal <= bestSupplier ? 'internal' : 'supplier',
      differenceMinor: Math.abs(internal - bestSupplier),
      recommendation: internal <= bestSupplier ? 'Keep internal unless capacity is blocked.' : 'Supplier may protect margin or capacity for this job.'
    };
  });
}

function buildMarginAlerts(jobCostings: Store[]) {
  return jobCostings
    .filter((job) => job.underpriced || job.marginBand === 'watch' || job.profitMinor < 0)
    .map((job) => ({
      id: `margin-alert-${job.jobId}`,
      severity: job.profitMinor < 0 ? 'critical' : job.underpriced ? 'high' : 'watch',
      jobId: job.jobId,
      orderNumber: job.orderNumber,
      marginPercent: job.marginPercent,
      profitMinor: job.profitMinor,
      totalCostMinor: job.totalCostMinor,
      sellPriceMinor: job.sellPriceMinor,
      reason: job.profitMinor < 0
        ? 'Production cost exceeds sell price.'
        : job.underpriced
          ? `Margin is below minimum ${COST_SETTINGS.minimumMarginPercent}%.`
          : 'Margin is below target and should be reviewed.',
      action: 'Review pricing, gang-run grouping, supplier outsourcing, or production route.'
    }));
}

function buildCostSummary(jobCostings: Store[]) {
  const sell = jobCostings.reduce((sum, job) => sum + asNumber(job.sellPriceMinor), 0);
  const cost = jobCostings.reduce((sum, job) => sum + asNumber(job.totalCostMinor), 0);
  const profit = sell - cost;
  const margin = sell > 0 ? Math.round((profit / sell) * 1000) / 10 : 0;
  return {
    currency: COST_SETTINGS.currency,
    totalJobs: jobCostings.length,
    totalSellPriceMinor: money(sell),
    totalCostMinor: money(cost),
    totalProfitMinor: money(profit),
    blendedMarginPercent: margin,
    underpricedJobs: jobCostings.filter((job) => job.underpriced).length,
    lossMakingJobs: jobCostings.filter((job) => job.profitMinor < 0).length,
    healthyJobs: jobCostings.filter((job) => job.marginBand === 'healthy').length,
    totalMaterialCostMinor: money(jobCostings.reduce((sum, job) => sum + asNumber(job.materialCostMinor), 0)),
    totalRuntimeCostMinor: money(jobCostings.reduce((sum, job) => sum + asNumber(job.runtimeCostMinor), 0)),
    totalLabourCostMinor: money(jobCostings.reduce((sum, job) => sum + asNumber(job.labourCostMinor), 0)),
    totalFinishingCostMinor: money(jobCostings.reduce((sum, job) => sum + asNumber(job.finishingCostMinor), 0)),
    totalWasteCostMinor: money(jobCostings.reduce((sum, job) => sum + asNumber(job.wasteCostMinor), 0)),
    targetMarginPercent: COST_SETTINGS.targetMarginPercent,
    minimumMarginPercent: COST_SETTINGS.minimumMarginPercent
  };
}

export async function getProductionCostingIntelligence(request: Request) {
  const [planner, board, imposition] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    getProductionImpositionIntelligence(request)
  ]);

  const jobCostings = buildJobCostings(planner, board, imposition);
  const supplierComparison = buildSupplierComparison(jobCostings);
  const marginAlerts = buildMarginAlerts(jobCostings);
  const summary = buildCostSummary(jobCostings);

  return {
    settings: COST_SETTINGS,
    jobCostings,
    supplierComparison,
    marginAlerts,
    summary,
    source: 'internal-production-costing-intelligence',
    generatedAt: nowIso()
  };
}

export async function recordCostingDecision(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('costing-action'),
    action: input.action || 'costing-note',
    at: nowIso(),
    note: input.note || 'Production costing decision recorded.',
    jobId: input.jobId || null,
    orderNumber: input.orderNumber || null,
    operator: input.operator || null,
    marginPercent: input.marginPercent || null,
    source: 'production-costing-intelligence'
  }, ...board.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items: board.items, actions });
  return getProductionCostingIntelligence(request);
}
