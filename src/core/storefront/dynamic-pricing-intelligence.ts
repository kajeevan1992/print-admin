import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getProductionCostingIntelligence } from '@/core/storefront/production-costing-intelligence';
import { getProductionImpositionIntelligence } from '@/core/storefront/production-imposition-intelligence';

/**
 * v320 Dynamic Pricing Intelligence + Auto Quote Engine
 *
 * Reuses live internal production intelligence:
 * - v319 production costing and margin intelligence
 * - v318 imposition/gang-run waste intelligence
 * - planner lane capacity and runtime pressure
 * - production board workflow/preflight/dispatch state
 *
 * This is not a demo quote calculator. It is the internal pricing brain that admin,
 * hosted storefronts and quote tools can consume through internal core routes.
 */

type Store = Record<string, any>;

const PRICING_SETTINGS = {
  currency: 'GBP',
  defaultTargetMarginPercent: 35,
  minimumMarginPercent: 22,
  rushMultiplier: 1.25,
  priorityMultiplier: 1.12,
  highCapacityMultiplier: 1.08,
  blockedCapacityMultiplier: 1.15,
  supplierMarkupPercent: 28,
  minimumChargeMinor: 1900,
  artworkSetupMinor: 1500,
  designServiceMinor: 3500,
  zeroVatRate: 0,
  standardVatRate: 20
};

const ZERO_VAT_HINTS = ['leaflet', 'flyer', 'booklet', 'brochure', 'menu', 'newsletter'];
const STANDARD_VAT_HINTS = ['business card', 'card', 'banner', 'poster', 'board', 'sign', 'sticker', 'label', 'vinyl', 'packaging'];

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

function money(value: number) {
  return Math.round(value);
}

function productText(input: Store) {
  return `${input.product || ''} ${input.productName || ''} ${input.productSlug || ''} ${input.title || ''}`.toLowerCase();
}

function vatRateFor(input: Store, lineType = 'product') {
  if (lineType === 'design' || lineType === 'artwork' || lineType === 'service') return PRICING_SETTINGS.standardVatRate;
  const text = productText(input);
  if (ZERO_VAT_HINTS.some((hint) => text.includes(hint))) return PRICING_SETTINGS.zeroVatRate;
  if (STANDARD_VAT_HINTS.some((hint) => text.includes(hint))) return PRICING_SETTINGS.standardVatRate;
  return PRICING_SETTINGS.standardVatRate;
}

function grossFromNet(netMinor: number, vatRate: number) {
  return money(netMinor * (1 + vatRate / 100));
}

function vatAmount(netMinor: number, vatRate: number) {
  return money(netMinor * (vatRate / 100));
}

function targetSellFromCost(costMinor: number, targetMarginPercent: number) {
  const margin = Math.min(85, Math.max(1, targetMarginPercent));
  return money(costMinor / (1 - margin / 100));
}

function classifyTurnaround(input: Store) {
  const text = `${input.turnaround || ''} ${input.priority || ''} ${input.service || ''}`.toLowerCase();
  if (text.includes('same') || text.includes('rush') || text.includes('express')) return 'rush';
  if (text.includes('priority') || text.includes('next')) return 'priority';
  return 'standard';
}

function turnaroundMultiplier(turnaround: string) {
  if (turnaround === 'rush') return PRICING_SETTINGS.rushMultiplier;
  if (turnaround === 'priority') return PRICING_SETTINGS.priorityMultiplier;
  return 1;
}

function findCostingForInput(input: Store, costing: Store) {
  const rows = Array.isArray(costing.jobCostings) ? costing.jobCostings : [];
  const order = String(input.orderNumber || '').toLowerCase();
  const job = String(input.jobId || '').toLowerCase();
  return rows.find((row) => String(row.orderNumber || '').toLowerCase() === order || String(row.jobId || '').toLowerCase() === job) || null;
}

function estimateBaseCost(input: Store) {
  const quantity = Math.max(1, asNumber(input.quantity, 250));
  const text = productText(input);
  const sheetYield = text.includes('business') ? 21 : text.includes('a5') ? 4 : text.includes('a4') ? 2 : 1;
  const sheets = Math.max(1, Math.ceil(quantity / sheetYield));
  const material = sheets * (text.includes('board') ? 650 : text.includes('banner') ? 450 : 18);
  const runtime = Math.max(10, sheets * 0.5) * 42;
  const labour = Math.max(10, sheets * 0.35) * 28;
  const finishing = text.includes('booklet') ? Math.max(1800, sheets * 55) : text.includes('laminat') ? Math.max(1200, sheets * 35) : Math.max(600, sheets * 12);
  const overhead = (material + runtime + labour + finishing) * 0.12;
  return money(material + runtime + labour + finishing + overhead);
}

function capacityMultiplier(machineStatus: Store[], laneName?: string) {
  const machine = machineStatus.find((item) => item.name === laneName || item.id === laneName);
  if (!machine) return 1;
  if (machine.status === 'blocked' || machine.status === 'downtime') return PRICING_SETTINGS.blockedCapacityMultiplier;
  if (asNumber(machine.utilisationPercent, 0) >= 85) return PRICING_SETTINGS.highCapacityMultiplier;
  return 1;
}

function supplierPrice(costRow: Store | null, input: Store) {
  if (!costRow) return null;
  const comparison = asNumber(costRow.totalCostMinor, 0);
  if (!comparison) return null;
  return money(comparison * (1 + PRICING_SETTINGS.supplierMarkupPercent / 100));
}

function buildQuoteLine(input: Store, context: Store) {
  const costing = context.costing;
  const machineStatus = context.machineStatus || [];
  const costRow = findCostingForInput(input, costing);
  const productionCostMinor = costRow ? asNumber(costRow.totalCostMinor, 0) : estimateBaseCost(input);
  const targetMargin = asNumber(input.targetMarginPercent, PRICING_SETTINGS.defaultTargetMarginPercent);
  const turnaround = classifyTurnaround(input);
  const baseNet = targetSellFromCost(productionCostMinor, targetMargin);
  const laneMultiplier = capacityMultiplier(machineStatus, costRow?.laneName || input.laneName);
  const turnMultiplier = turnaroundMultiplier(turnaround);
  const impositionSavingMinor = costRow?.savedSheets ? money(asNumber(costRow.savedSheets, 0) * 18) : 0;
  const protectedNet = money(Math.max(PRICING_SETTINGS.minimumChargeMinor, (baseNet - impositionSavingMinor) * laneMultiplier * turnMultiplier));
  const supplierNet = supplierPrice(costRow, input);
  const vatRate = vatRateFor(input, 'product');
  const vatMinor = vatAmount(protectedNet, vatRate);
  const grossMinor = grossFromNet(protectedNet, vatRate);
  const marginPercent = protectedNet > 0 ? Math.round(((protectedNet - productionCostMinor) / protectedNet) * 1000) / 10 : 0;

  return {
    id: input.id || makeId('quote-line'),
    product: input.product || input.productName || costRow?.product || 'Print product',
    orderNumber: input.orderNumber || costRow?.orderNumber || null,
    jobId: input.jobId || costRow?.jobId || null,
    quantity: Math.max(1, asNumber(input.quantity, costRow?.quantity || 250)),
    turnaround,
    source: costRow ? 'production-costing' : 'estimated-cost-model',
    productionCostMinor,
    targetMarginPercent: targetMargin,
    marginPercent,
    marginProtected: marginPercent >= PRICING_SETTINGS.minimumMarginPercent,
    impositionSavingMinor,
    capacityMultiplier: laneMultiplier,
    turnaroundMultiplier: turnMultiplier,
    netMinor: protectedNet,
    vatRate,
    vatMinor,
    grossMinor,
    supplierNetMinor: supplierNet,
    supplierRecommendation: supplierNet && supplierNet < protectedNet ? 'supplier-price-competitive' : 'internal-price-ok',
    alerts: [
      marginPercent < PRICING_SETTINGS.minimumMarginPercent ? 'margin-below-minimum' : null,
      laneMultiplier > 1 ? 'capacity-pressure-applied' : null,
      turnaround !== 'standard' ? `${turnaround}-turnaround-applied` : null
    ].filter(Boolean)
  };
}

function addServiceLines(lines: Store[], input: Store) {
  const serviceLines: Store[] = [];
  if (input.artworkCheck || input.artworkSetup) {
    const net = PRICING_SETTINGS.artworkSetupMinor;
    const vatRate = vatRateFor(input, 'artwork');
    serviceLines.push({ id: makeId('service-line'), product: 'Artwork setup / file check', lineType: 'artwork', quantity: 1, netMinor: net, vatRate, vatMinor: vatAmount(net, vatRate), grossMinor: grossFromNet(net, vatRate), productionCostMinor: 0, marginPercent: 100, source: 'service-charge' });
  }
  if (input.designService) {
    const net = PRICING_SETTINGS.designServiceMinor;
    const vatRate = vatRateFor(input, 'design');
    serviceLines.push({ id: makeId('service-line'), product: 'Design service', lineType: 'design', quantity: 1, netMinor: net, vatRate, vatMinor: vatAmount(net, vatRate), grossMinor: grossFromNet(net, vatRate), productionCostMinor: 0, marginPercent: 100, source: 'service-charge' });
  }
  return [...lines, ...serviceLines];
}

function summarizeQuote(lines: Store[]) {
  const net = lines.reduce((sum, line) => sum + asNumber(line.netMinor, 0), 0);
  const vat = lines.reduce((sum, line) => sum + asNumber(line.vatMinor, 0), 0);
  const gross = lines.reduce((sum, line) => sum + asNumber(line.grossMinor, 0), 0);
  const cost = lines.reduce((sum, line) => sum + asNumber(line.productionCostMinor, 0), 0);
  const profit = net - cost;
  return {
    currency: PRICING_SETTINGS.currency,
    lineCount: lines.length,
    netMinor: money(net),
    vatMinor: money(vat),
    grossMinor: money(gross),
    productionCostMinor: money(cost),
    profitMinor: money(profit),
    marginPercent: net > 0 ? Math.round((profit / net) * 1000) / 10 : 0,
    zeroVatLines: lines.filter((line) => asNumber(line.vatRate, 0) === 0).length,
    standardVatLines: lines.filter((line) => asNumber(line.vatRate, 0) > 0).length,
    marginProtected: lines.every((line) => line.lineType === 'design' || line.lineType === 'artwork' || line.marginProtected !== false)
  };
}

function buildPricingRecommendations(lines: Store[], context: Store) {
  const recommendations = [];
  const quote = summarizeQuote(lines);
  if (quote.marginPercent < PRICING_SETTINGS.minimumMarginPercent) {
    recommendations.push({ severity: 'critical', title: 'Quote below minimum margin', message: 'Increase sell price, batch into a gang run, or route to a cheaper supplier.' });
  }
  if ((context.imposition?.summary?.recommendedGangRuns || 0) > 0) {
    recommendations.push({ severity: 'info', title: 'Gang-run saving available', message: `${context.imposition.summary.recommendedGangRuns} gang-run opportunities can improve sheet usage before quoting.` });
  }
  if ((context.costing?.summary?.underpricedJobs || 0) > 0) {
    recommendations.push({ severity: 'warning', title: 'Underpriced live jobs detected', message: 'Use current costing intelligence before repeating similar prices.' });
  }
  const supplierLines = lines.filter((line) => line.supplierRecommendation === 'supplier-price-competitive');
  if (supplierLines.length) {
    recommendations.push({ severity: 'watch', title: 'Supplier route may protect capacity', message: `${supplierLines.length} line(s) have supplier pricing worth comparing.` });
  }
  return recommendations;
}

async function buildPricingContext(request: Request) {
  const [planner, board, costing, imposition] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    getProductionCostingIntelligence(request),
    getProductionImpositionIntelligence(request)
  ]);

  const machineStatus = Array.isArray(planner.lanes) ? planner.lanes.map((lane: Store) => {
    const jobs = Array.isArray(planner.jobs) ? planner.jobs.filter((job: Store) => job.laneId === lane.id && job.stage !== 'completed') : [];
    const usedMinutes = jobs.reduce((sum: number, job: Store) => sum + asNumber(job.estimatedMinutes, 0), 0);
    const capacityMinutes = Math.max(30, asNumber(lane.minutesPerDay, 420));
    return {
      id: lane.id,
      name: lane.name,
      status: jobs.some((job: Store) => job.productionBlocked || job.stage === 'blocked') ? 'blocked' : usedMinutes > capacityMinutes ? 'overloaded' : 'available',
      utilisationPercent: Math.round((usedMinutes / Math.max(1, capacityMinutes)) * 100),
      usedMinutes,
      capacityMinutes
    };
  }) : [];

  return { planner, board, costing, imposition, machineStatus };
}

export async function generateDynamicQuote(request: Request, input: Store) {
  const context = await buildPricingContext(request);
  const inputLines = Array.isArray(input.lines) && input.lines.length ? input.lines : [input];
  const productLines = inputLines.map((line) => buildQuoteLine(line, context));
  const lines = addServiceLines(productLines, input);
  const summary = summarizeQuote(lines);
  const recommendations = buildPricingRecommendations(lines, context);

  return {
    id: input.quoteId || makeId('quote'),
    customer: input.customer || 'Walk-in customer',
    channel: input.channel || 'admin-internal',
    status: summary.marginProtected ? 'ready' : 'review-required',
    lines,
    summary,
    recommendations,
    source: 'internal-dynamic-pricing-intelligence',
    generatedAt: nowIso()
  };
}

export async function getDynamicPricingIntelligence(request: Request) {
  const context = await buildPricingContext(request);
  const costingRows = Array.isArray(context.costing.jobCostings) ? context.costing.jobCostings : [];
  const sampleLines = costingRows.slice(0, 12).map((row: Store) => buildQuoteLine({ jobId: row.jobId, orderNumber: row.orderNumber, product: row.product, quantity: row.quantity }, context));
  const summary = summarizeQuote(sampleLines);

  return {
    settings: PRICING_SETTINGS,
    livePricingPreview: sampleLines,
    summary,
    recommendations: buildPricingRecommendations(sampleLines, context),
    productionCostingSummary: context.costing.summary,
    impositionSummary: context.imposition.summary,
    source: 'internal-dynamic-pricing-intelligence',
    generatedAt: nowIso()
  };
}

export async function recordPricingDecision(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('pricing-action'),
    action: input.action || 'pricing-decision',
    at: nowIso(),
    note: input.note || 'Dynamic pricing decision recorded.',
    quoteId: input.quoteId || null,
    jobId: input.jobId || null,
    orderNumber: input.orderNumber || null,
    operator: input.operator || null,
    source: 'dynamic-pricing-intelligence'
  }, ...board.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items: board.items, actions });
  return getDynamicPricingIntelligence(request);
}
