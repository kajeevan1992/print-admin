import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readPlannerStore, updatePlannerJob } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getProductionEstimatorIntelligence } from '@/core/storefront/production-estimator-simulation';

/**
 * v322 Smart Artwork Preflight + Automated Production Validation
 *
 * Reuses existing live systems:
 * - Production Board artworkStatus/preflightStatus/handoffState
 * - Production Planner machine lanes/material limits
 * - existing operations artwork proof config records where available
 * - v321 estimator compatibility output
 *
 * It does not create pages or demo-only data. This module updates the same
 * board/planner workflow state used by production, costing, pricing and estimator.
 */

type Store = Record<string, any>;

const CONFIG_RESOURCE = 'admin-config' as any;
const ARTWORK_PROOFS_KEY = 'admin_artwork_proofs_store';
const PREFLIGHT_LOG_KEY = 'storefront-artwork-preflight-log';

const PREFLIGHT_RULES = {
  minDpi: 300,
  largeFormatMinDpi: 120,
  requiredBleedMm: 3,
  safeZoneMm: 3,
  maxPdfPageOvershootMm: 2,
  supportedColourProfiles: ['cmyk', 'fogra39', 'fogra51', 'iso coated', 'gracol'],
  allowedFileTypes: ['pdf', 'ai', 'eps', 'tif', 'tiff', 'jpg', 'jpeg', 'png'],
  spotLayerHints: ['spot uv', 'spot-uv', 'uv', 'foil', 'white ink', 'cut contour', 'cutcontour']
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

function cleanText(value: unknown) {
  return String(value || '').toLowerCase();
}

function productText(job: Store) {
  return `${job.product || ''} ${job.productName || ''} ${job.productSlug || ''} ${job.title || ''}`.toLowerCase();
}

function classifyJob(job: Store) {
  const text = productText(job);
  if (text.includes('banner') || text.includes('pvc') || text.includes('vinyl')) return 'large-format';
  if (text.includes('booklet') || text.includes('catalog') || text.includes('brochure')) return 'booklet';
  if (text.includes('business')) return 'business-card';
  if (text.includes('foil')) return 'foil';
  if (text.includes('spot') || text.includes('uv')) return 'spot-uv';
  return 'sheet-print';
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

async function readPreflightLog(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PREFLIGHT_LOG_KEY);
    const store = (record as any)?.metadataJson?.store || {};
    return { validations: Array.isArray(store.validations) ? store.validations : [], actions: Array.isArray(store.actions) ? store.actions : [] };
  } catch {
    return { validations: [], actions: [] };
  }
}

async function savePreflightLog(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: PREFLIGHT_LOG_KEY,
    slug: PREFLIGHT_LOG_KEY,
    name: 'Artwork preflight validation log',
    description: 'Persistent artwork validation results linked to production board and planner workflow.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: PREFLIGHT_LOG_KEY,
      source: 'ArtworkPreflightValidation'
    }
  } as any);
}

function issue(id: string, severity: 'info' | 'warning' | 'fail', rule: string, message: string, blocksProduction = false) {
  return { id, severity, rule, message, blocksProduction };
}

function fileExtension(file: Store) {
  const name = cleanText(file.name || file.filename || file.url || file.path);
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop() || '' : cleanText(file.type || file.extension);
}

function validateFileType(file: Store) {
  const ext = fileExtension(file);
  if (!ext) return [issue('file-type-missing', 'warning', 'file-type', 'Artwork file type is missing; manual prepress review required.', false)];
  if (!PREFLIGHT_RULES.allowedFileTypes.includes(ext)) return [issue('file-type-unsupported', 'fail', 'file-type', `Unsupported artwork file type: ${ext}.`, true)];
  return [];
}

function validateBleed(file: Store, job: Store) {
  const bleed = asNumber(file.bleedMm ?? file.bleed ?? file.metadata?.bleedMm, -1);
  if (bleed < 0) return [issue('bleed-unknown', 'warning', 'bleed', 'Bleed value is missing; prepress must confirm before production.', false)];
  if (bleed < PREFLIGHT_RULES.requiredBleedMm) return [issue('bleed-too-small', 'fail', 'bleed', `Artwork bleed is ${bleed}mm; required bleed is ${PREFLIGHT_RULES.requiredBleedMm}mm.`, true)];
  return [];
}

function validateSafeZone(file: Store) {
  const safe = asNumber(file.safeZoneMm ?? file.safeZone ?? file.metadata?.safeZoneMm, -1);
  if (safe < 0) return [issue('safe-zone-unknown', 'warning', 'safe-zone', 'Safe-zone value is missing; manual review required.', false)];
  if (safe < PREFLIGHT_RULES.safeZoneMm) return [issue('safe-zone-too-small', 'fail', 'safe-zone', `Safe zone is ${safe}mm; required safe zone is ${PREFLIGHT_RULES.safeZoneMm}mm.`, true)];
  return [];
}

function validateDpi(file: Store, job: Store) {
  const dpi = asNumber(file.dpi ?? file.resolutionDpi ?? file.metadata?.dpi, 0);
  const min = classifyJob(job) === 'large-format' ? PREFLIGHT_RULES.largeFormatMinDpi : PREFLIGHT_RULES.minDpi;
  if (!dpi) return [issue('dpi-unknown', 'warning', 'dpi', 'Artwork DPI is missing; manual review required.', false)];
  if (dpi < min) return [issue('dpi-too-low', 'fail', 'dpi', `Artwork is ${dpi} DPI; minimum for this product is ${min} DPI.`, true)];
  return [];
}

function validateColour(file: Store) {
  const profile = cleanText(file.colourProfile || file.colorProfile || file.metadata?.colourProfile || file.metadata?.colorProfile);
  const mode = cleanText(file.colourMode || file.colorMode || file.metadata?.colourMode || file.metadata?.colorMode);
  const issues = [];
  if (mode && !mode.includes('cmyk')) issues.push(issue('colour-mode-not-cmyk', 'warning', 'colour', `Artwork colour mode is ${mode}; CMYK is recommended for production.`, false));
  if (profile && !PREFLIGHT_RULES.supportedColourProfiles.some((item) => profile.includes(item))) issues.push(issue('colour-profile-review', 'warning', 'colour-profile', `Colour profile ${profile} should be reviewed before print.`, false));
  if (!mode && !profile) issues.push(issue('colour-unknown', 'warning', 'colour', 'Colour mode/profile is missing; manual review required.', false));
  return issues;
}

function validateFonts(file: Store) {
  const embedded = file.fontsEmbedded ?? file.metadata?.fontsEmbedded;
  const outlined = file.fontsOutlined ?? file.metadata?.fontsOutlined;
  if (embedded === false && outlined !== true) return [issue('fonts-not-embedded', 'fail', 'fonts', 'Fonts are not embedded or outlined.', true)];
  if (embedded === undefined && outlined === undefined) return [issue('fonts-unknown', 'warning', 'fonts', 'Font embedding status is missing; manual review required.', false)];
  return [];
}

function validateSpotLayers(file: Store, job: Store) {
  const text = productText(job);
  const needsSpot = text.includes('spot') || text.includes('uv') || text.includes('foil') || text.includes('cut contour');
  if (!needsSpot) return [];
  const layers = Array.isArray(file.spotLayers) ? file.spotLayers.map(cleanText) : Array.isArray(file.metadata?.spotLayers) ? file.metadata.spotLayers.map(cleanText) : [];
  if (!layers.length) return [issue('spot-layer-missing', 'fail', 'spot-layer', 'Spot UV / foil / cut layer is required but was not found in artwork metadata.', true)];
  const hasRequired = PREFLIGHT_RULES.spotLayerHints.some((hint) => layers.some((layer: string) => layer.includes(hint)));
  if (!hasRequired) return [issue('spot-layer-name-review', 'warning', 'spot-layer', 'Spot layer exists but naming does not match expected production layer names.', false)];
  return [];
}

function validateBooklet(file: Store, job: Store) {
  if (classifyJob(job) !== 'booklet') return [];
  const pages = asNumber(file.pageCount ?? file.metadata?.pageCount, 0);
  if (!pages) return [issue('page-count-unknown', 'warning', 'booklet-pages', 'Booklet page count is missing; prepress must verify pagination.', false)];
  if (pages % 4 !== 0) return [issue('page-count-not-multiple-of-four', 'fail', 'booklet-pages', `Booklet page count is ${pages}; it must be divisible by 4.`, true)];
  return [];
}

function validateMachineSize(file: Store, job: Store, planner: Store) {
  const width = asNumber(file.widthMm ?? file.metadata?.widthMm, 0);
  const height = asNumber(file.heightMm ?? file.metadata?.heightMm, 0);
  if (!width || !height) return [issue('size-unknown', 'warning', 'machine-size', 'Artwork size is missing; machine compatibility requires manual review.', false)];
  const lanes = Array.isArray(planner.lanes) ? planner.lanes : [];
  const product = productText(job);
  const compatible = lanes.filter((lane) => {
    const maxWidth = asNumber(lane.maxWidthMm, 0);
    const supports = Array.isArray(lane.supports) ? lane.supports.map(cleanText) : [];
    const supportsProduct = supports.includes('all') || supports.some((support: string) => product.includes(support));
    return supportsProduct && (!maxWidth || Math.min(width, height) <= maxWidth || Math.max(width, height) <= maxWidth);
  });
  if (!compatible.length) return [issue('machine-size-incompatible', 'fail', 'machine-size', `Artwork size ${width}x${height}mm does not match an available compatible machine lane.`, true)];
  return [];
}

function validateFinishingCompatibility(file: Store, job: Store) {
  const text = `${productText(job)} ${cleanText(job.productionNotes)}`;
  const issues = [];
  if (text.includes('fold') && asNumber(file.safeZoneMm ?? file.metadata?.safeZoneMm, 0) < PREFLIGHT_RULES.safeZoneMm) {
    issues.push(issue('fold-safe-zone-risk', 'fail', 'finishing', 'Fold/crease job does not have enough safe zone.', true));
  }
  if (text.includes('laminat') && cleanText(file.finish || file.metadata?.finish).includes('uncoated')) {
    issues.push(issue('lamination-stock-review', 'warning', 'finishing', 'Lamination requested on uncoated stock; production review recommended.', false));
  }
  return issues;
}

function validateOne(job: Store, file: Store, planner: Store) {
  const issues = [
    ...validateFileType(file),
    ...validateBleed(file, job),
    ...validateSafeZone(file),
    ...validateDpi(file, job),
    ...validateColour(file),
    ...validateFonts(file),
    ...validateSpotLayers(file, job),
    ...validateBooklet(file, job),
    ...validateMachineSize(file, job, planner),
    ...validateFinishingCompatibility(file, job)
  ];
  const blocking = issues.filter((item) => item.blocksProduction || item.severity === 'fail');
  const warnings = issues.filter((item) => item.severity === 'warning');
  const status = blocking.length ? 'fail' : warnings.length ? 'warning' : 'pass';
  return {
    id: makeId('preflight-result'),
    jobId: job.id || file.jobId || null,
    orderNumber: job.orderNumber || file.orderNumber || null,
    product: job.product || job.productName || file.product || 'Print product',
    fileName: file.name || file.filename || file.url || 'Artwork file',
    status,
    productionBlocked: blocking.length > 0,
    issues,
    checkedAt: nowIso(),
    source: 'smart-artwork-preflight-validation'
  };
}

function findBoardJob(boardItems: Store[], input: Store) {
  const order = cleanText(input.orderNumber);
  const id = cleanText(input.jobId || input.id);
  return boardItems.find((job) => cleanText(job.orderNumber) === order || cleanText(job.id) === id) || null;
}

function normaliseFiles(input: Store, boardJob: Store | null) {
  const files = Array.isArray(input.files) ? input.files : input.file ? [input.file] : [];
  if (files.length) return files;
  return [{
    name: input.filename || input.name || `${boardJob?.orderNumber || 'artwork'}-metadata-required.pdf`,
    orderNumber: input.orderNumber || boardJob?.orderNumber,
    jobId: input.jobId || boardJob?.id,
    product: input.product || boardJob?.product,
    metadataMissing: true
  }];
}

async function applyPreflightToBoardAndPlanner(request: Request, result: Store, note?: string) {
  const board = await readProductionBoardStore(request);
  const items = board.items.map((job) => {
    if (cleanText(job.orderNumber) !== cleanText(result.orderNumber) && cleanText(job.id) !== cleanText(result.jobId)) return job;
    return {
      ...job,
      artworkStatus: result.status === 'pass' ? 'approved' : result.status === 'warning' ? 'preflight-review' : 'changes-requested',
      preflightStatus: result.status,
      handoffState: result.productionBlocked ? 'blocked' : job.handoffState === 'blocked' ? 'ready-for-print' : job.handoffState,
      productionNotes: note || result.issues.map((item: Store) => item.message).join(' | ') || job.productionNotes
    };
  });
  const actions = [{
    id: makeId('preflight-action'),
    action: result.productionBlocked ? 'preflight-block' : result.status === 'warning' ? 'preflight-warning' : 'preflight-pass',
    at: nowIso(),
    note: note || `${result.fileName}: ${result.status}`,
    jobId: result.jobId,
    orderNumber: result.orderNumber,
    source: 'smart-artwork-preflight-validation'
  }, ...board.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items, actions });

  if (result.jobId || result.orderNumber) {
    await updatePlannerJob(request, {
      jobId: result.jobId || result.orderNumber,
      action: result.productionBlocked ? 'hold' : 'resume',
      note: note || `Preflight ${result.status}: ${result.fileName}`
    }).catch(() => null);
  }
}

export async function runArtworkPreflightValidation(request: Request, input: Store) {
  const [planner, board, previousLog] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    readPreflightLog(request)
  ]);
  const boardJob = findBoardJob(board.items, input);
  const job = { ...(boardJob || {}), ...input };
  const files = normaliseFiles(input, boardJob);
  const results = files.map((file) => validateOne(job, { ...file, orderNumber: file.orderNumber || job.orderNumber, jobId: file.jobId || job.id }, planner));
  const aggregateStatus = results.some((item) => item.status === 'fail') ? 'fail' : results.some((item) => item.status === 'warning') ? 'warning' : 'pass';
  const aggregate = {
    id: makeId('preflight-run'),
    orderNumber: job.orderNumber || input.orderNumber || null,
    jobId: job.id || input.jobId || null,
    status: aggregateStatus,
    productionBlocked: results.some((item) => item.productionBlocked),
    fileCount: results.length,
    results,
    checkedAt: nowIso(),
    source: 'smart-artwork-preflight-validation'
  };

  await savePreflightLog(request, {
    validations: [aggregate, ...previousLog.validations].slice(0, 300),
    actions: previousLog.actions
  });
  await applyPreflightToBoardAndPlanner(request, aggregate, input.note);

  return aggregate;
}

export async function getArtworkPreflightIntelligence(request: Request) {
  const [planner, board, proofs, log, estimator] = await Promise.all([
    readPlannerStore(request),
    readProductionBoardStore(request),
    readConfigList(request, ARTWORK_PROOFS_KEY),
    readPreflightLog(request),
    getProductionEstimatorIntelligence(request).catch(() => null)
  ]);

  const boardItems = Array.isArray(board.items) ? board.items : [];
  const validations = Array.isArray(log.validations) ? log.validations : [];
  const blockedJobs = boardItems.filter((job) => job.preflightStatus === 'fail' || job.handoffState === 'blocked');
  const reviewJobs = boardItems.filter((job) => job.preflightStatus === 'warning' || job.artworkStatus === 'preflight-review' || job.artworkStatus === 'uploaded');
  const approvedJobs = boardItems.filter((job) => job.preflightStatus === 'pass' || job.artworkStatus === 'approved');

  return {
    rules: PREFLIGHT_RULES,
    validations,
    artworkProofs: proofs,
    productionValidation: {
      blockedJobs: blockedJobs.map((job) => ({ id: job.id, orderNumber: job.orderNumber, product: job.product, reason: job.productionNotes || 'Artwork/preflight block' })),
      reviewJobs: reviewJobs.map((job) => ({ id: job.id, orderNumber: job.orderNumber, product: job.product, preflightStatus: job.preflightStatus, artworkStatus: job.artworkStatus })),
      approvedJobs: approvedJobs.map((job) => ({ id: job.id, orderNumber: job.orderNumber, product: job.product }))
    },
    machineValidation: {
      lanes: Array.isArray(planner.lanes) ? planner.lanes.length : 0,
      estimatorCompatibility: estimator?.compatibility || []
    },
    summary: {
      totalBoardJobs: boardItems.length,
      blockedJobs: blockedJobs.length,
      reviewJobs: reviewJobs.length,
      approvedJobs: approvedJobs.length,
      validationRuns: validations.length,
      proofRecords: proofs.length,
      failedRuns: validations.filter((item) => item.status === 'fail').length,
      warningRuns: validations.filter((item) => item.status === 'warning').length,
      passedRuns: validations.filter((item) => item.status === 'pass').length
    },
    source: 'internal-artwork-preflight-validation',
    generatedAt: nowIso()
  };
}

export async function recordPreflightDecision(request: Request, input: Store) {
  const log = await readPreflightLog(request);
  const actions = [{
    id: makeId('preflight-decision'),
    action: input.action || 'preflight-decision',
    at: nowIso(),
    note: input.note || 'Artwork preflight decision recorded.',
    jobId: input.jobId || null,
    orderNumber: input.orderNumber || null,
    operator: input.operator || null,
    source: 'smart-artwork-preflight-validation'
  }, ...log.actions].slice(0, 300);

  await savePreflightLog(request, { validations: log.validations, actions });
  return getArtworkPreflightIntelligence(request);
}
