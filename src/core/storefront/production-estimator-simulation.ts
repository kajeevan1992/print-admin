import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getProductionImpositionIntelligence } from '@/core/storefront/production-imposition-intelligence';
import { getProductionCostingIntelligence } from '@/core/storefront/production-costing-intelligence';
import { generateDynamicQuote } from '@/core/storefront/dynamic-pricing-intelligence';

/**
 * v321 Smart Production Estimator + Machine Simulation Engine
 *
 * Reuses live internal production intelligence:
 * - Planner lanes, jobs, shifts, downtime and capacity
 * - Production Board workflow/preflight/dispatch state
 * - v318 imposition/gang-run intelligence
 * - v319 production costing
 * - v320 dynamic quote/pricing engine
 *
 * This module is the pre-quote and pre-production simulation layer. It does not
 * create a disconnected demo estimator.
 */

type Store = Record<string, any>;

const ESTIMATOR_SETTINGS = {
  defaultShiftStartHour: 8,
  defaultShiftEndHour: 17,
  defaultMakeReadyMinutes: 8,
  defaultSheetsPerHour: 500,
  dispatchPackMinutes: 12,
  operatorEfficiencyPercent: 88,
  rushBufferPercent: 8,
  standardBufferPercent: 15,
  blockedPreflightPenaltyMinutes: 240
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

function productText(input: Store) {
  return `${input.product || ''} ${input.productName || ''} ${input.productSlug || ''} ${input.title || ''}`.toLowerCase();
}

function quantityFor(input: Store) {
  return Math.max(1, asNumber(input.quantity || input.payload?.quantity || input.items?.[0]?.quantity, 250));
}

function yieldFor(input: Store) {
  const explicit = asNumber(input.sra3Yield, 0);
  if (explicit > 0) return explicit;
  const text = productText(input);
  if (text.includes('business')) return 21;
  if (text.includes('a5')) return 4;
  if (text.includes('a4')) return 2;
  return 1;
}

function sheetCount(input: Store) {
  const explicit = asNumber(input.sra3Sheets, 0);
  if (explicit > 0) return explicit;
  return Math.max(1, Math.ceil(quantityFor(input) / yieldFor(input)));
}

function classifyStageChain(input: Store) {
  const text = productText(input);
  const chain = ['prepress', 'print'];
  if (text.includes('booklet') || text.includes('fold') || text.includes('crease') || text.includes('laminat') || text.includes('foil') || text.includes('uv')) chain.push('finish');
  chain.push('dispatch');
  return chain;
}

function classifyCompatibleLane(input: Store, lanes: Store[]) {
  const text = productText(input);
  const compatible = lanes.filter((lane) => {
    const supports = Array.isArray(lane.supports) ? lane.supports.map((item: string) => item.toLowerCase()) : [];
    return supports.includes('all') || supports.some((support: string) => text.includes(support));
  });
  if (compatible.length) return compatible.sort((a, b) => asNumber(a.utilisationPercent, 0) - asNumber(b.utilisationPercent, 0))[0];
  if (text.includes('banner') || text.includes('pvc') || text.includes('vinyl')) return lanes.find((lane) => String(lane.type).includes('large')) || lanes[0];
  if (text.includes('booklet')) return lanes.find((lane) => String(lane.name).toLowerCase().includes('sra2')) || lanes[0];
  return lanes.find((lane) => String(lane.name).toLowerCase().includes('sra3')) || lanes[0];
}

function enabledShiftMinutes(shifts: Store[]) {
  const enabled = shifts.filter((shift) => shift.enabled !== false);
  const total = enabled.reduce((sum, shift) => sum + Math.max(0, (asNumber(shift.endHour, ESTIMATOR_SETTINGS.defaultShiftEndHour) - asNumber(shift.startHour, ESTIMATOR_SETTINGS.defaultShiftStartHour)) * 60), 0);
  return total || ((ESTIMATOR_SETTINGS.defaultShiftEndHour - ESTIMATOR_SETTINGS.defaultShiftStartHour) * 60);
}

function laneQueueMinutes(lane: Store, plannerJobs: Store[]) {
  return plannerJobs
    .filter((job) => job.laneId === lane.id && !['completed', 'blocked'].includes(String(job.stage)))
    .reduce((sum, job) => sum + asNumber(job.estimatedMinutes, 0), 0);
}

function downtimeMinutes(lane: Store, downtime: Store[]) {
  return downtime
    .filter((item) => item.laneId === lane.id && item.active !== false)
    .reduce((sum, item) => sum + asNumber(item.minutes, 0), 0);
}

function estimatePrintMinutes(input: Store, lane: Store) {
  const sheets = sheetCount(input);
  const makeReady = asNumber(lane.makeReadyMinutes, ESTIMATOR_SETTINGS.defaultMakeReadyMinutes);
  const speed = Math.max(1, asNumber(lane.speedSheetsPerHour, ESTIMATOR_SETTINGS.defaultSheetsPerHour));
  const runMinutes = (sheets / speed) * 60;
  return Math.ceil(makeReady + runMinutes);
}

function estimateFinishMinutes(input: Store) {
  const text = productText(input);
  const sheets = sheetCount(input);
  let minutes = Math.max(6, sheets * 0.2);
  if (text.includes('laminat')) minutes += Math.max(12, sheets * 0.35);
  if (text.includes('fold')) minutes += Math.max(10, sheets * 0.25);
  if (text.includes('crease')) minutes += Math.max(10, sheets * 0.25);
  if (text.includes('booklet')) minutes += Math.max(18, sheets * 0.55);
  if (text.includes('foil')) minutes += Math.max(25, sheets * 0.5);
  if (text.includes('uv')) minutes += Math.max(20, sheets * 0.45);
  return Math.ceil(minutes);
}

function estimatePrepressMinutes(input: Store, boardItems: Store[]) {
  const orderNumber = String(input.orderNumber || '').toLowerCase();
  const board = boardItems.find((job) => String(job.orderNumber || '').toLowerCase() === orderNumber);
  if (board?.preflightStatus === 'fail' || board?.handoffState === 'blocked') return ESTIMATOR_SETTINGS.blockedPreflightPenaltyMinutes;
  if (board?.preflightStatus === 'pass' || board?.artworkStatus === 'approved') return 5;
  return input.artworkSupplied === false ? 45 : 18;
}

function stageMinutes(input: Store, lane: Store, boardItems: Store[]) {
  const chain = classifyStageChain(input);
  const stages = chain.map((stage) => {
    if (stage === 'prepress') return { stage, minutes: estimatePrepressMinutes(input, boardItems) };
    if (stage === 'print') return { stage, minutes: estimatePrintMinutes(input, lane) };
    if (stage === 'finish') return { stage, minutes: estimateFinishMinutes(input) };
    return { stage, minutes: ESTIMATOR_SETTINGS.dispatchPackMinutes };
  });
  return stages;
}

function addWorkingMinutes(start: Date, minutes: number, dailyMinutes: number) {
  const days = Math.floor(minutes / Math.max(1, dailyMinutes));
  const remainder = minutes % Math.max(1, dailyMinutes);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setMinutes(end.getMinutes() + remainder);
  return end;
}

function simulateInput(input: Store, context: Store) {
  const lanes = Array.isArray(context.planner.lanes) ? context.planner.lanes : [];
  const plannerJobs = Array.isArray(context.planner.jobs) ? context.planner.jobs : [];
  const downtime = Array.isArray(context.planner.downtime) ? context.planner.downtime : [];
  const shifts = Array.isArray(context.planner.shifts) ? context.planner.shifts : [];
  const boardItems = Array.isArray(context.board.items) ? context.board.items : [];
  const lane = classifyCompatibleLane(input, lanes) || {};
  const queue = laneQueueMinutes(lane, plannerJobs);
  const down = downtimeMinutes(lane, downtime);
  const dailyCapacity = Math.max(30, enabledShiftMinutes(shifts) - down);
  const stages = stageMinutes(input, lane, boardItems);
  const productionMinutes = stages.reduce((sum, item) => sum + asNumber(item.minutes, 0), 0);
  const turnaround = String(input.turnaround || input.priority || '').toLowerCase();
  const bufferPercent = turnaround.includes('rush') || turnaround.includes('same') ? ESTIMATOR_SETTINGS.rushBufferPercent : ESTIMATOR_SETTINGS.standardBufferPercent;
  const bufferMinutes = Math.ceil(productionMinutes * (bufferPercent / 100));
  const operatorEfficiencyPenalty = Math.ceil(productionMinutes * ((100 - ESTIMATOR_SETTINGS.operatorEfficiencyPercent) / 100));
  const totalMinutes = queue + productionMinutes + bufferMinutes + operatorEfficiencyPenalty;
  const startAt = new Date();
  const estimatedStartAt = addWorkingMinutes(startAt, queue, dailyCapacity);
  const estimatedCompletionAt = addWorkingMinutes(startAt, totalMinutes, dailyCapacity);

  return {
    id: input.id || makeId('simulation'),
    product: input.product || input.productName || 'Print product',
    orderNumber: input.orderNumber || null,
    quantity: quantityFor(input),
    compatible: Boolean(lane?.id),
    selectedLaneId: lane?.id || null,
    selectedLaneName: lane?.name || 'No compatible lane found',
    stageChain: stages,
    sheets: sheetCount(input),
    sra3Yield: yieldFor(input),
    queueMinutes: queue,
    downtimeMinutes: down,
    productionMinutes,
    bufferMinutes,
    operatorEfficiencyPenaltyMinutes: operatorEfficiencyPenalty,
    totalEstimatedMinutes: totalMinutes,
    dailyCapacityMinutes: dailyCapacity,
    estimatedStartAt: estimatedStartAt.toISOString(),
    estimatedCompletionAt: estimatedCompletionAt.toISOString(),
    confidence: !lane?.id ? 'low' : down > 0 || queue > dailyCapacity ? 'medium' : 'high',
    riskFlags: [
      !lane?.id ? 'no-compatible-machine' : null,
      down > 0 ? 'machine-downtime-active' : null,
      queue > dailyCapacity ? 'queue-exceeds-shift-capacity' : null,
      stages.some((stage) => stage.minutes >= ESTIMATOR_SETTINGS.blockedPreflightPenaltyMinutes) ? 'preflight-block-risk' : null
    ].filter(Boolean)
  };
}

function validateCompatibility(simulations: Store[]) {
  return simulations.map((simulation) => ({
    simulationId: simulation.id,
    product: simulation.product,
    compatible: simulation.compatible,
    laneName: simulation.selectedLaneName,
    blockers: simulation.riskFlags.filter((flag: string) => ['no-compatible-machine', 'preflight-block-risk'].includes(flag)),
    recommendation: simulation.compatible ? 'Machine route available.' : 'Add machine capability/material support before quoting this product.'
  }));
}

function buildQueueForecast(simulations: Store[], planner: Store) {
  const jobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  const activeJobs = jobs.filter((job) => !['completed', 'blocked'].includes(String(job.stage)));
  const addedMinutes = simulations.reduce((sum, item) => sum + asNumber(item.productionMinutes, 0), 0);
  const existingMinutes = activeJobs.reduce((sum, job) => sum + asNumber(job.estimatedMinutes, 0), 0);
  return {
    activePlannerJobs: activeJobs.length,
    existingQueueMinutes: existingMinutes,
    simulatedAddedMinutes: addedMinutes,
    projectedQueueMinutes: existingMinutes + addedMinutes,
    impact: addedMinutes > 240 ? 'major' : addedMinutes > 90 ? 'medium' : 'low'
  };
}

function buildOperatorLoad(simulations: Store[], planner: Store) {
  const shifts = Array.isArray(planner.shifts) ? planner.shifts.filter((shift) => shift.enabled !== false) : [];
  const labourMinutes = simulations.reduce((sum, item) => sum + asNumber(item.productionMinutes, 0), 0);
  const capacity = enabledShiftMinutes(shifts);
  return {
    enabledShifts: shifts.length,
    simulatedOperatorMinutes: labourMinutes,
    availableShiftMinutes: capacity,
    loadPercent: Math.round((labourMinutes / Math.max(1, capacity)) * 100),
    status: labourMinutes > capacity ? 'overloaded' : labourMinutes > capacity * 0.8 ? 'heavy' : 'normal'
  };
}

async function buildEstimatorContext(request: Request) {
  const [planner, board, imposition, costing] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    getProductionImpositionIntelligence(request),
    getProductionCostingIntelligence(request)
  ]);
  return { planner, board, imposition, costing };
}

export async function simulateProductionEstimate(request: Request, input: Store) {
  const context = await buildEstimatorContext(request);
  const lines = Array.isArray(input.lines) && input.lines.length ? input.lines : [input];
  const simulations = lines.map((line) => simulateInput(line, context));
  const quote = await generateDynamicQuote(request, input).catch(() => null);
  const queueForecast = buildQueueForecast(simulations, context.planner);
  const operatorLoad = buildOperatorLoad(simulations, context.planner);

  return {
    id: input.estimateId || makeId('estimate'),
    simulations,
    compatibility: validateCompatibility(simulations),
    queueForecast,
    operatorLoad,
    quote,
    impositionSummary: context.imposition.summary,
    costingSummary: context.costing.summary,
    summary: {
      lineCount: simulations.length,
      totalEstimatedMinutes: simulations.reduce((sum, item) => sum + asNumber(item.totalEstimatedMinutes, 0), 0),
      maxCompletionAt: simulations.map((item) => item.estimatedCompletionAt).sort().slice(-1)[0] || null,
      lowConfidenceLines: simulations.filter((item) => item.confidence === 'low').length,
      riskFlags: Array.from(new Set(simulations.flatMap((item) => item.riskFlags || [])))
    },
    source: 'internal-production-estimator-simulation',
    generatedAt: nowIso()
  };
}

export async function getProductionEstimatorIntelligence(request: Request) {
  const context = await buildEstimatorContext(request);
  const boardItems = Array.isArray(context.board.items) ? context.board.items : [];
  const sampleLines = boardItems.slice(0, 12).map((job) => ({
    id: job.id,
    product: job.product,
    orderNumber: job.orderNumber,
    quantity: job.quantity || 250,
    turnaround: job.priority || 'standard',
    artworkSupplied: job.artworkStatus === 'approved'
  }));
  const simulations = sampleLines.map((line) => simulateInput(line, context));

  return {
    settings: ESTIMATOR_SETTINGS,
    simulations,
    compatibility: validateCompatibility(simulations),
    queueForecast: buildQueueForecast(simulations, context.planner),
    operatorLoad: buildOperatorLoad(simulations, context.planner),
    impositionSummary: context.imposition.summary,
    costingSummary: context.costing.summary,
    summary: {
      simulatedJobs: simulations.length,
      totalEstimatedMinutes: simulations.reduce((sum, item) => sum + asNumber(item.totalEstimatedMinutes, 0), 0),
      incompatibleJobs: simulations.filter((item) => !item.compatible).length,
      highRiskJobs: simulations.filter((item) => item.riskFlags.length > 0).length
    },
    source: 'internal-production-estimator-simulation',
    generatedAt: nowIso()
  };
}

export async function recordEstimatorDecision(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('estimator-action'),
    action: input.action || 'estimator-decision',
    at: nowIso(),
    note: input.note || 'Production estimate/simulation decision recorded.',
    estimateId: input.estimateId || null,
    jobId: input.jobId || null,
    orderNumber: input.orderNumber || null,
    operator: input.operator || null,
    source: 'production-estimator-simulation'
  }, ...board.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items: board.items, actions });
  return getProductionEstimatorIntelligence(request);
}
