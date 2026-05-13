import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';

/**
 * v318 Smart Gang Run + Imposition Intelligence
 *
 * This module deliberately reuses existing live internal stores:
 * - production planner jobs/lanes/batches/sra3 sheets/yield
 * - production board workflow state/preflight/handoff
 *
 * It does not create a duplicate production engine or disconnected demo data.
 */

type Store = Record<string, any>;

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
  return `${job.productName || ''} ${job.productSlug || ''} ${job.product || ''} ${job.orderNumber || ''}`.toLowerCase();
}

function classifyFormat(job: Store) {
  const text = productText(job);
  if (text.includes('business')) return 'business-card';
  if (text.includes('booklet') || text.includes('catalog')) return 'booklet';
  if (text.includes('flyer') || text.includes('leaflet')) return text.includes('a5') ? 'a5-flyer' : 'flyer-leaflet';
  if (text.includes('banner') || text.includes('pvc')) return 'roll-banner';
  if (text.includes('poster')) return 'poster';
  if (text.includes('vinyl')) return 'vinyl';
  return 'general-print';
}

function classifyMedia(job: Store) {
  const text = productText(job);
  if (text.includes('banner') || text.includes('pvc') || text.includes('roll')) return 'roll-media';
  if (text.includes('board') || text.includes('foamex') || text.includes('dibond')) return 'rigid-board';
  return 'sheet';
}

function finishingKey(job: Store) {
  const text = `${productText(job)} ${job.productionNotes || ''} ${job.finish || ''}`.toLowerCase();
  const parts = [];
  if (text.includes('laminat')) parts.push('lamination');
  if (text.includes('fold')) parts.push('folding');
  if (text.includes('crease')) parts.push('creasing');
  if (text.includes('booklet') || text.includes('saddle')) parts.push('booklet-making');
  if (text.includes('spot') || text.includes('uv')) parts.push('spot-uv');
  if (text.includes('foil')) parts.push('foil');
  if (!parts.length) parts.push('trim-only');
  return parts.sort().join('+');
}

function stockKey(job: Store) {
  const text = productText(job);
  if (text.includes('soft touch')) return 'soft-touch-stock';
  if (text.includes('matt')) return 'matt-stock';
  if (text.includes('silk')) return 'silk-stock';
  if (text.includes('gloss')) return 'gloss-stock';
  if (text.includes('banner') || text.includes('pvc')) return 'pvc-roll';
  if (text.includes('vinyl')) return 'vinyl-roll';
  return 'standard-stock';
}

function quantityFor(job: Store) {
  return asNumber(job.quantity || job.payload?.quantity || job.items?.[0]?.quantity, 0);
}

function yieldFor(job: Store) {
  return Math.max(1, asNumber(job.sra3Yield, classifyFormat(job) === 'business-card' ? 21 : classifyFormat(job) === 'a5-flyer' ? 4 : classifyFormat(job) === 'flyer-leaflet' ? 2 : 1));
}

function sheetsFor(job: Store) {
  const explicit = asNumber(job.sra3Sheets, 0);
  if (explicit > 0) return explicit;
  const qty = quantityFor(job);
  return Math.max(1, Math.ceil(qty / yieldFor(job)));
}

function canGang(job: Store, boardByOrder: Map<string, Store>) {
  if (job.productionBlocked || job.stage === 'blocked' || job.stage === 'completed') return false;
  const board = boardByOrder.get(String(job.orderNumber || '').toLowerCase());
  if (board?.handoffState === 'blocked' || board?.preflightStatus === 'fail') return false;
  const preflight = cleanText(job.preflightStatus || board?.preflightStatus || 'pass');
  return ['pass', 'override', 'approved'].includes(preflight);
}

function groupKey(job: Store, boardByOrder: Map<string, Store>) {
  const board = boardByOrder.get(String(job.orderNumber || '').toLowerCase()) || {};
  return [
    job.laneId || board.machineName || 'unassigned-lane',
    classifyMedia(job),
    stockKey(job),
    classifyFormat(job),
    finishingKey({ ...job, ...board }),
    yieldFor(job),
    cleanText(job.preflightStatus || board.preflightStatus || 'pass')
  ].join('|');
}

function buildGangRunGroups(plannerJobs: Store[], boardItems: Store[], lanes: Store[]) {
  const boardByOrder = new Map(boardItems.map((job) => [String(job.orderNumber || '').toLowerCase(), job]));
  const groups = new Map<string, Store[]>();
  plannerJobs.filter((job) => canGang(job, boardByOrder)).forEach((job) => {
    const key = groupKey(job, boardByOrder);
    groups.set(key, [...(groups.get(key) || []), job]);
  });

  return Array.from(groups.entries()).map(([key, jobs]) => {
    const [laneId, media, stock, format, finishing, sheetYield] = key.split('|');
    const lane = lanes.find((item) => item.id === laneId) || {};
    const totalQuantity = jobs.reduce((sum, job) => sum + quantityFor(job), 0);
    const totalSra3Sheets = jobs.reduce((sum, job) => sum + sheetsFor(job), 0);
    const combinedYield = Math.max(1, Number(sheetYield) || yieldFor(jobs[0] || {}));
    const combinedSheets = Math.max(1, Math.ceil(totalQuantity / combinedYield));
    const savedSheets = Math.max(0, totalSra3Sheets - combinedSheets);
    const makeReadyMinutes = asNumber(lane.makeReadyMinutes, 8);
    const estimatedSetupSavingMinutes = jobs.length > 1 ? Math.max(0, (jobs.length - 1) * makeReadyMinutes) : 0;
    const wasteSlots = Math.max(0, combinedSheets * combinedYield - totalQuantity);
    const wastePercent = Math.round((wasteSlots / Math.max(1, combinedSheets * combinedYield)) * 100);

    return {
      id: `gang-${laneId}-${stock}-${format}-${finishing}-${jobs.length}`.replace(/[^a-zA-Z0-9-_]/g, '-'),
      laneId,
      laneName: lane.name || laneId,
      media,
      stock,
      format,
      finishing,
      jobCount: jobs.length,
      jobIds: jobs.map((job) => job.id),
      orderNumbers: jobs.map((job) => job.orderNumber),
      totalQuantity,
      totalSra3Sheets,
      combinedSheets,
      savedSheets,
      sra3Yield: combinedYield,
      wasteSlots,
      wastePercent,
      estimatedSetupSavingMinutes,
      recommended: jobs.length > 1 && (savedSheets > 0 || estimatedSetupSavingMinutes > 0),
      reason: jobs.length > 1
        ? `Same ${stock}, ${format}, ${finishing} on ${lane.name || laneId}; combine to reduce setup and sheet waste.`
        : 'Single compatible job only; keep as standalone unless another matching job arrives.'
    };
  }).sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.estimatedSetupSavingMinutes - a.estimatedSetupSavingMinutes || b.savedSheets - a.savedSheets);
}

function buildSheetImpositionPlans(groups: Store[]) {
  return groups.map((group) => ({
    id: `imposition-${group.id}`,
    gangRunId: group.id,
    format: group.format,
    media: group.media,
    stock: group.stock,
    sra3Yield: group.sra3Yield,
    sheetsRequired: group.combinedSheets,
    totalUps: group.combinedSheets * group.sra3Yield,
    usedUps: group.totalQuantity,
    wasteUps: group.wasteSlots,
    wastePercent: group.wastePercent,
    cuttingPlan: group.format === 'business-card'
      ? '21-up SRA3 card grid, trim down to business card stacks.'
      : group.format === 'a5-flyer'
        ? '4-up SRA3 A5 layout, guillotine trim after print.'
        : group.format.includes('flyer')
          ? '2-up/4-up SRA3 layout depending finished size; verify grain and bleed.'
          : 'Single-up or product-specific layout; verify artwork box before output.',
    risk: group.wastePercent > 25 ? 'high-waste' : group.wastePercent > 12 ? 'watch' : 'efficient'
  }));
}

function buildFinishingCompatibleBatches(groups: Store[]) {
  return groups
    .filter((group) => group.jobCount > 1)
    .map((group) => ({
      id: `finish-${group.id}`,
      gangRunId: group.id,
      finishing: group.finishing,
      orderNumbers: group.orderNumbers,
      jobCount: group.jobCount,
      batchable: !String(group.finishing).includes('foil') && !String(group.finishing).includes('spot-uv'),
      note: String(group.finishing).includes('trim-only')
        ? 'Batch trim together after print.'
        : `Batch compatible ${String(group.finishing).replace(/\+/g, ', ')} jobs after print.`
    }));
}

function buildRollNesting(plannerJobs: Store[], boardItems: Store[], lanes: Store[]) {
  const boardByOrder = new Map(boardItems.map((job) => [String(job.orderNumber || '').toLowerCase(), job]));
  return plannerJobs
    .filter((job) => classifyMedia(job) === 'roll-media' && canGang(job, boardByOrder))
    .map((job) => {
      const lane = lanes.find((item) => item.id === job.laneId) || {};
      const rollWidthMm = asNumber(lane.maxWidthMm, 1600) || 1600;
      const text = productText(job);
      const estimatedWidthMm = text.includes('banner') ? Math.min(1200, rollWidthMm) : Math.min(800, rollWidthMm);
      const estimatedLengthM = Math.max(1, Math.round(quantityFor(job) / 10) || 1);
      const sideWasteMm = Math.max(0, rollWidthMm - estimatedWidthMm);
      return {
        id: `roll-${job.id}`,
        jobId: job.id,
        orderNumber: job.orderNumber,
        laneId: job.laneId,
        laneName: lane.name || job.laneName || 'Roll media lane',
        rollWidthMm,
        estimatedWidthMm,
        estimatedLengthM,
        sideWasteMm,
        nestingAdvice: sideWasteMm > 300 ? 'Look for another narrow roll-media job to nest beside this print.' : 'Width usage is acceptable for this roll lane.',
        risk: sideWasteMm > 500 ? 'high-side-waste' : sideWasteMm > 300 ? 'watch' : 'efficient'
      };
    });
}

function buildWasteAnalytics(groups: Store[], rollPlans: Store[]) {
  const totalSavedSheets = groups.reduce((sum, group) => sum + asNumber(group.savedSheets), 0);
  const totalWasteSlots = groups.reduce((sum, group) => sum + asNumber(group.wasteSlots), 0);
  const recommendedGangRuns = groups.filter((group) => group.recommended).length;
  const highWastePlans = groups.filter((group) => group.wastePercent > 25).length + rollPlans.filter((plan) => plan.risk === 'high-side-waste').length;
  return {
    recommendedGangRuns,
    totalSavedSheets,
    totalWasteSlots,
    highWastePlans,
    rollNestingWarnings: rollPlans.filter((plan) => plan.risk !== 'efficient').length,
    estimatedSetupSavingMinutes: groups.reduce((sum, group) => sum + asNumber(group.estimatedSetupSavingMinutes), 0)
  };
}

export async function getProductionImpositionIntelligence(request: Request) {
  const [planner, board] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request)
  ]);

  const plannerJobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  const lanes = Array.isArray(planner.lanes) ? planner.lanes : [];
  const boardItems = Array.isArray(board.items) ? board.items : [];

  const gangRunGroups = buildGangRunGroups(plannerJobs, boardItems, lanes);
  const impositionPlans = buildSheetImpositionPlans(gangRunGroups);
  const finishingBatches = buildFinishingCompatibleBatches(gangRunGroups);
  const rollNesting = buildRollNesting(plannerJobs, boardItems, lanes);
  const wasteAnalytics = buildWasteAnalytics(gangRunGroups, rollNesting);

  return {
    gangRunGroups,
    impositionPlans,
    finishingBatches,
    rollNesting,
    wasteAnalytics,
    summary: {
      plannerJobs: plannerJobs.length,
      boardJobs: boardItems.length,
      recommendedGangRuns: wasteAnalytics.recommendedGangRuns,
      impositionPlans: impositionPlans.length,
      finishingBatches: finishingBatches.length,
      rollNestingPlans: rollNesting.length,
      totalSavedSheets: wasteAnalytics.totalSavedSheets,
      estimatedSetupSavingMinutes: wasteAnalytics.estimatedSetupSavingMinutes,
      highWastePlans: wasteAnalytics.highWastePlans
    },
    source: 'internal-production-imposition-intelligence',
    generatedAt: nowIso()
  };
}

export async function recordImpositionDecision(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const action = String(input.action || 'imposition-note');
  const actions = [{
    id: makeId('imposition-action'),
    action,
    at: nowIso(),
    note: input.note || 'Imposition/gang-run decision recorded.',
    gangRunId: input.gangRunId || null,
    jobId: input.jobId || null,
    orderNumber: input.orderNumber || null,
    operator: input.operator || null,
    source: 'production-imposition-intelligence'
  }, ...board.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items: board.items, actions });
  return getProductionImpositionIntelligence(request);
}
