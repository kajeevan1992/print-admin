import { buildSeoAnalyticsDashboard } from './seo-analytics.service';
import { saveSeoPage, type SeoPageRecord } from './seo-engine.service';

type QueueStatus = 'open' | 'in_progress' | 'done' | 'snoozed';
type QueueType = 'seo-error' | 'missing-meta' | 'thin-content' | 'low-readability' | 'low-ctr' | 'page-two' | 'no-impressions' | 'no-internal-links' | 'no-conversions' | 'monitor';
type QueuePriority = 'urgent' | 'high' | 'medium' | 'low';

type AnalyticsMetric = {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  gaSessions: number;
  gaConversions: number;
  source: string;
  topQueries?: Array<{ query: string; clicks: number; impressions: number; position: number }>;
};

type AnalyticsRow = {
  page: SeoPageRecord;
  path: string;
  url: string;
  pageType: string;
  status: string;
  indexable: boolean;
  score: number;
  readabilityScore: number;
  errors: string[];
  warnings: string[];
  metric: AnalyticsMetric;
  ctrPercent: number;
  conversionRatePercent: number;
  opportunity: string;
};

export type ContentImprovementTask = {
  id: string;
  path: string;
  title: string;
  pageType: string;
  status: QueueStatus;
  pageStatus: string;
  priority: QueuePriority;
  type: QueueType;
  reason: string;
  action: string;
  score: number;
  impact: number;
  effort: number;
  metric: AnalyticsMetric;
  pageScore: number;
  readabilityScore: number;
  warnings: string[];
  errors: string[];
  suggestions: {
    title?: string;
    metaDescription?: string;
    h1?: string;
    introCopy?: string;
    internalLinks?: Array<{ label: string; href: string }>;
  };
  updatedAt?: string;
};

function cleanPath(value: string) {
  const raw = String(value || '/').trim() || '/';
  try { if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname || '/'; } catch {}
  const clean = raw.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/^https?:\/\/[^/]+/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'home';
}

function words(value: string) {
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}

function number(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function taskId(type: QueueType, path: string) {
  return `${type}-${slugify(path)}`;
}

function queueMeta(page: SeoPageRecord) {
  const metadata = page.metadata || {};
  const queue = metadata.contentImprovementQueue || {};
  return queue && typeof queue === 'object' ? queue as Record<string, any> : {};
}

function queueStatusFor(page: SeoPageRecord, type: QueueType): QueueStatus {
  const value = queueMeta(page)?.[type]?.status;
  if (value === 'in_progress' || value === 'done' || value === 'snoozed') return value;
  return 'open';
}

function priority(impact: number, effort: number, errors = 0): QueuePriority {
  const score = impact - effort * 4 + errors * 10;
  if (score >= 80) return 'urgent';
  if (score >= 58) return 'high';
  if (score >= 34) return 'medium';
  return 'low';
}

function titleFor(page: SeoPageRecord) {
  const product = page.productName || 'Print';
  const location = page.locationName || 'Sidcup';
  if (page.pageType === 'product-location') return `${product} ${location} | Order Online | Holo Print`;
  if (page.pageType === 'collection-point') return `Print Collection ${location} | Order Online | Holo Print`;
  if (page.pageType === 'service-area') return `Printing in ${location} | Holo Print`;
  if (page.pageType === 'guide') return `${page.h1 || page.targetKeyword || 'Print Guide'} | Holo Print`;
  if (page.pageType === 'product') return `${product} Printing | Holo Print`;
  return page.title || `${page.h1 || 'Holo Print'} | Holo Print`;
}

function metaFor(page: SeoPageRecord) {
  const product = page.productName || 'printing';
  const location = page.locationName || 'Sidcup';
  if (page.pageType === 'collection-point') return `Order print online from Holo Print and collect from ${location} when available. We confirm collection details when your order is ready.`;
  if (page.pageType === 'service-area') return `Order ${product} with Holo Print for ${location}. Upload artwork online, request a quote and choose available delivery or collection options.`;
  if (page.pageType === 'product-location') return `Order ${product} in ${location} with Holo Print. Upload artwork, request design help and choose available collection or delivery options.`;
  if (page.pageType === 'guide') return `Read this Holo Print guide for artwork, file setup and print ordering advice before sending your design or placing an order.`;
  return `Order ${product} from Holo Print. Upload artwork online, request a quote and choose available collection or delivery options.`;
}

function introFor(page: SeoPageRecord) {
  const product = page.productName || 'print';
  const location = page.locationName || 'Sidcup';
  const type = page.pageType;
  if (type === 'collection-point') return `Use this page to understand collection options for ${location}. Place your order online first, wait for the ready confirmation, and only travel when the collection details have been confirmed. Partner collection points must not be described as Holo Print branches.`;
  if (type === 'service-area') return `Holo Print can support ${location} customers with online ordering, artwork upload, quotes and available fulfilment options. This page is written as a service-area page and should not claim a physical branch unless one exists.`;
  if (type === 'product-location') return `${product} in ${location} can be ordered online with Holo Print. Choose the product options, upload artwork or request help, then confirm collection or delivery during checkout. For custom quantities, sizes or finishing, request a quote before production.`;
  if (type === 'guide') return `This guide helps customers prepare artwork and understand the print ordering process. Use it to reduce delays, answer common questions and link customers to the correct product or quote route.`;
  return `Order ${product} online with Holo Print. Choose your print options, upload artwork, request design support and confirm fulfilment during checkout. Custom jobs can be reviewed before payment and production.`;
}

function missingMeta(page: SeoPageRecord) {
  return !page.title || !page.metaDescription || !page.h1 || page.title.length < 35 || page.metaDescription.length < 110;
}

function isThin(page: SeoPageRecord) {
  const copy = [page.introCopy, page.metaDescription, ...(page.faqItems || []).map((item) => `${item.question} ${item.answer}`)].join(' ');
  return words(copy).length < 90;
}

function hasInternalLinkWarning(row: AnalyticsRow) {
  return row.warnings.some((item) => /internal links/i.test(item)) || !row.page.internalLinks?.length;
}

function baseSuggestions(page: SeoPageRecord) {
  const links = page.internalLinks?.length ? page.internalLinks : [
    { label: 'Browse all print products', href: '/all-products' },
    { label: 'Upload artwork', href: '/artwork-upload' },
    { label: 'Request a bespoke quote', href: '/bespoke-quote' },
  ];
  return { title: titleFor(page), metaDescription: metaFor(page), h1: page.h1 || page.productName || page.title || 'Holo Print', introCopy: page.introCopy && words(page.introCopy).length >= 90 ? page.introCopy : introFor(page), internalLinks: links };
}

function createTask(row: AnalyticsRow, type: QueueType, reason: string, action: string, impact: number, effort: number, extra: Partial<ContentImprovementTask> = {}): ContentImprovementTask {
  const page = row.page;
  const status = queueStatusFor(page, type);
  const errors = row.errors.length;
  return {
    id: taskId(type, row.path),
    path: cleanPath(row.path),
    title: page.title || page.h1 || row.path,
    pageType: page.pageType,
    status,
    pageStatus: page.status,
    priority: priority(impact, effort, errors),
    type,
    reason,
    action,
    score: Math.max(0, Math.round(impact - effort * 3 + errors * 8)),
    impact,
    effort,
    metric: row.metric,
    pageScore: row.score,
    readabilityScore: row.readabilityScore,
    warnings: row.warnings,
    errors: row.errors,
    suggestions: baseSuggestions(page),
    updatedAt: page.updatedAt,
    ...extra,
  };
}

function tasksForRow(row: AnalyticsRow) {
  const tasks: ContentImprovementTask[] = [];
  const page = row.page;
  const metric = row.metric;
  const impressions = number(metric.impressions);
  const ctr = number(metric.ctr);
  const position = number(metric.position);
  const sourceIsReal = metric.source && metric.source !== 'estimate';

  if (row.errors.length) tasks.push(createTask(row, 'seo-error', 'SEO errors are blocking the page from being reliable.', 'Fix the listed SEO errors before publishing or measuring performance.', 95, 3));
  if (missingMeta(page)) tasks.push(createTask(row, 'missing-meta', 'Title, meta description or H1 is missing/weak.', 'Rewrite the SEO title, meta description and H1.', 82, 2));
  if (isThin(page)) tasks.push(createTask(row, 'thin-content', 'The page has thin body/FAQ content.', 'Add useful intro copy, ordering guidance, FAQs and internal links.', 74, 4));
  if (row.readabilityScore < 70) tasks.push(createTask(row, 'low-readability', 'Readability score is below target.', 'Break copy into clearer paragraphs and shorter sentences.', 66, 3));
  if (hasInternalLinkWarning(row)) tasks.push(createTask(row, 'no-internal-links', 'Internal links are missing or weak.', 'Add links to related products, location pages, guides and quote routes.', 72, 2));
  if (sourceIsReal && impressions > 100 && ctr < 0.02) tasks.push(createTask(row, 'low-ctr', 'High impressions but low CTR.', 'Improve SEO title and meta description to match search intent.', 88, 2));
  if (sourceIsReal && position > 10 && impressions > 20) tasks.push(createTask(row, 'page-two', 'Ranking on page 2+ with impressions.', 'Improve content depth, add internal links and answer top queries.', 84, 4));
  if (page.status === 'published' && sourceIsReal && impressions === 0) tasks.push(createTask(row, 'no-impressions', 'Published page has no Search Console impressions.', 'Check sitemap, indexing, canonical URL and internal links.', 70, 3));
  if (sourceIsReal && metric.gaSessions > 30 && metric.gaConversions === 0) tasks.push(createTask(row, 'no-conversions', 'Traffic exists but there are no GA conversions.', 'Improve CTA links, quote route and product/order links on this page.', 64, 3));
  if (!tasks.length) tasks.push(createTask(row, 'monitor', 'No urgent issue found.', 'Monitor performance and keep content fresh.', 18, 1, { priority: 'low' }));
  return tasks;
}

export async function buildContentImprovementQueue(request: Request, filters: { search?: string; pageType?: string; status?: string; source?: string; taskStatus?: string; priority?: string; type?: string; hideDone?: boolean } = {}) {
  const analytics = await buildSeoAnalyticsDashboard(request, { search: filters.search || '', pageType: filters.pageType || 'all', status: filters.status || 'all', source: filters.source || 'all' });
  let tasks = (analytics.rows as AnalyticsRow[]).flatMap(tasksForRow);
  if (filters.type && filters.type !== 'all') tasks = tasks.filter((task) => task.type === filters.type);
  if (filters.priority && filters.priority !== 'all') tasks = tasks.filter((task) => task.priority === filters.priority);
  if (filters.taskStatus && filters.taskStatus !== 'all') tasks = tasks.filter((task) => task.status === filters.taskStatus);
  if (filters.hideDone) tasks = tasks.filter((task) => task.status !== 'done');
  tasks = tasks.sort((a, b) => b.score - a.score || b.impact - a.impact || a.effort - b.effort);
  return {
    tasks,
    summary: {
      tasks: tasks.length,
      urgent: tasks.filter((task) => task.priority === 'urgent').length,
      high: tasks.filter((task) => task.priority === 'high').length,
      medium: tasks.filter((task) => task.priority === 'medium').length,
      low: tasks.filter((task) => task.priority === 'low').length,
      open: tasks.filter((task) => task.status === 'open').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      done: tasks.filter((task) => task.status === 'done').length,
      pages: new Set(tasks.map((task) => task.path)).size,
    },
    analyticsTotals: analytics.totals,
  };
}

export async function updateContentImprovementTaskStatus(request: Request, input: { path: string; type: QueueType; status: QueueStatus; note?: string }) {
  const queue = await buildContentImprovementQueue(request, { taskStatus: 'all', hideDone: false });
  const task = queue.tasks.find((item) => cleanPath(item.path) === cleanPath(input.path) && item.type === input.type);
  if (!task) throw new Error('Content improvement task not found.');
  const page = (await buildSeoAnalyticsDashboard(request, { search: input.path, status: 'all', pageType: 'all', source: 'all' })).rows.find((row: AnalyticsRow) => cleanPath(row.path) === cleanPath(input.path))?.page as SeoPageRecord | undefined;
  if (!page) throw new Error('SEO page not found for content improvement task.');
  const currentQueue = queueMeta(page);
  const nextQueue = {
    ...currentQueue,
    [input.type]: { status: input.status, note: input.note || '', updatedAt: new Date().toISOString() },
  };
  const saved = await saveSeoPage(request, { ...page, metadata: { ...(page.metadata || {}), contentImprovementQueue: nextQueue } });
  return { task: { ...task, status: input.status }, page: saved };
}

export async function applyContentImprovementQuickFix(request: Request, input: { path: string; type?: QueueType; statusAfter?: QueueStatus } ) {
  const queue = await buildContentImprovementQueue(request, { taskStatus: 'all', hideDone: false });
  const task = queue.tasks.find((item) => cleanPath(item.path) === cleanPath(input.path) && (!input.type || item.type === input.type));
  if (!task) throw new Error('Content improvement task not found.');
  const row = (await buildSeoAnalyticsDashboard(request, { search: input.path, status: 'all', pageType: 'all', source: 'all' })).rows.find((item: AnalyticsRow) => cleanPath(item.path) === cleanPath(input.path)) as AnalyticsRow | undefined;
  if (!row) throw new Error('SEO page not found for quick fix.');
  const page = row.page;
  const suggestions = task.suggestions;
  const shouldRewriteMeta = ['missing-meta', 'low-ctr', 'seo-error'].includes(task.type);
  const shouldRewriteCopy = ['thin-content', 'low-readability', 'page-two'].includes(task.type);
  const shouldAddLinks = ['no-internal-links', 'thin-content', 'page-two', 'no-conversions'].includes(task.type);
  const currentQueue = queueMeta(page);
  const nextQueue = {
    ...currentQueue,
    [task.type]: { status: input.statusAfter || 'in_progress', note: 'Quick fix applied by Build 49.', updatedAt: new Date().toISOString() },
  };
  const next = await saveSeoPage(request, {
    ...page,
    title: shouldRewriteMeta ? suggestions.title || page.title : page.title,
    metaDescription: shouldRewriteMeta ? suggestions.metaDescription || page.metaDescription : page.metaDescription,
    h1: shouldRewriteMeta ? suggestions.h1 || page.h1 : page.h1,
    introCopy: shouldRewriteCopy ? suggestions.introCopy || page.introCopy : page.introCopy,
    internalLinks: shouldAddLinks ? suggestions.internalLinks || page.internalLinks || [] : page.internalLinks || [],
    metadata: { ...(page.metadata || {}), contentImprovementQueue: nextQueue, contentImprovementQuickFixAppliedAt: new Date().toISOString() },
  });
  return { task, page: next };
}
