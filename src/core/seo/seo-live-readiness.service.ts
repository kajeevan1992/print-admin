import { buildSeoCrawlAudit } from './seo-public-output.service';
import { buildSeoAnalyticsDashboard } from './seo-analytics.service';
import { buildInternalLinkingDashboard } from './internal-linking.service';
import { buildContentImprovementQueue } from './content-improvement-queue.service';
import { buildSearchConsoleDashboard } from './google-search-console.service';
import { listSeoRedirects } from './seo-redirects.service';

export type SeoReadinessSeverity = 'pass' | 'info' | 'warning' | 'error';
export type SeoReadinessCategory = 'crawl' | 'sitemap' | 'robots' | 'metadata' | 'schema' | 'redirects' | 'analytics' | 'internal-links' | 'content' | 'storefront';

export type SeoReadinessCheck = {
  id: string;
  category: SeoReadinessCategory;
  severity: SeoReadinessSeverity;
  title: string;
  detail: string;
  action: string;
  path?: string;
  link?: string;
  weight: number;
};

function asArray<T>(value: T[] | undefined | null): T[] { return Array.isArray(value) ? value : []; }
function number(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function cleanPath(value: string) { const raw = String(value || '/').trim() || '/'; try { if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname || '/'; } catch {} const clean = raw.split('?')[0].split('#')[0] || '/'; return clean.startsWith('/') ? clean : `/${clean}`; }

function check(id: string, category: SeoReadinessCategory, severity: SeoReadinessSeverity, title: string, detail: string, action: string, weight = 1, extra: Partial<SeoReadinessCheck> = {}): SeoReadinessCheck {
  return { id, category, severity, title, detail, action, weight, ...extra };
}

function severityPenalty(item: SeoReadinessCheck) {
  if (item.severity === 'error') return 12 * item.weight;
  if (item.severity === 'warning') return 5 * item.weight;
  if (item.severity === 'info') return 1 * item.weight;
  return 0;
}

function grade(score: number) {
  if (score >= 92) return 'A';
  if (score >= 82) return 'B';
  if (score >= 70) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}

function readinessLabel(score: number, errors: number) {
  if (errors > 0) return 'Not ready';
  if (score >= 90) return 'Ready';
  if (score >= 75) return 'Almost ready';
  return 'Needs work';
}

function redirectChainChecks(redirects: any[]) {
  const active = redirects.filter((item) => item.isActive);
  const byFrom = new Map(active.map((item) => [cleanPath(item.fromPath), item]));
  const checks: SeoReadinessCheck[] = [];
  for (const redirect of active) {
    if (!redirect.toPath) continue;
    const target = cleanPath(redirect.toPath);
    if (byFrom.has(target)) {
      checks.push(check('redirect-chain-' + cleanPath(redirect.fromPath).replace(/[^a-z0-9]+/gi, '-'), 'redirects', 'warning', 'Redirect chain detected', `${redirect.fromPath} points to ${redirect.toPath}, which also has a redirect.`, 'Update the first redirect to point directly to the final URL.', 1, { path: redirect.fromPath, link: '/seo-redirects' }));
    }
  }
  return checks;
}

function metadataIssueChecks(crawlIssues: any[]) {
  return crawlIssues.map((issue, index) => {
    const message = String(issue.message || 'SEO issue');
    let category: SeoReadinessCategory = 'metadata';
    if (/schema/i.test(message)) category = 'schema';
    if (/sitemap/i.test(message)) category = 'sitemap';
    if (/canonical/i.test(message)) category = 'metadata';
    const sev: SeoReadinessSeverity = issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info';
    return check(`crawl-${index}`, category, sev, message, issue.path ? `${issue.path}: ${message}` : message, 'Open Robots & Sitemap Control or SEO Engine and fix the affected page.', sev === 'error' ? 2 : 1, { path: issue.path, link: issue.path ? `/seo-engine?search=${encodeURIComponent(issue.path)}` : '/robots-txt' });
  });
}

export async function buildSeoLiveReadiness(request: Request) {
  const [crawl, analytics, links, content, searchConsole, redirects] = await Promise.all([
    buildSeoCrawlAudit(request),
    buildSeoAnalyticsDashboard(request, { status: 'all', pageType: 'all', source: 'all' }),
    buildInternalLinkingDashboard(request, { status: 'all', pageType: 'all', minScore: 55, limit: 6 }),
    buildContentImprovementQueue(request, { taskStatus: 'all', hideDone: false }),
    buildSearchConsoleDashboard(request).catch((error) => ({ status: { connected: false, authMode: 'not-configured', siteUrl: '', canImport: false, lastImportAt: null, lastImportSummary: null }, setup: {}, error: error instanceof Error ? error.message : 'Search Console status unavailable.' })),
    listSeoRedirects(request, {}).catch(() => ({ items: [], summary: { total: 0, active: 0, inactive: 0, gone: 0, hits: 0 } })),
  ]);

  const checks: SeoReadinessCheck[] = [];
  const crawlSummary = crawl.summary || {};
  const analyticsTotals = analytics.totals || {};
  const linkSummary = links.summary || {};
  const contentSummary = content.summary || {};
  const redirectItems = asArray((redirects as any).items);
  const redirectSummary = (redirects as any).summary || {};

  checks.push(...metadataIssueChecks(asArray(crawl.issues)));

  if (number(crawlSummary.sitemapUrls) === 0) checks.push(check('sitemap-empty', 'sitemap', 'error', 'Sitemap has no URLs', 'Google will not find published SEO URLs from the sitemap.', 'Publish reviewed SEO pages and include them in sitemap.', 3, { link: '/robots-txt' }));
  else checks.push(check('sitemap-has-urls', 'sitemap', 'pass', 'Sitemap URLs found', `${crawlSummary.sitemapUrls} URLs are available across ${crawlSummary.sitemapFiles} sitemap file(s).`, 'Submit /sitemap.xml in Google Search Console.', 0, { link: '/sitemap.xml' }));

  if (number(crawlSummary.sitemapFiles) === 0) checks.push(check('sitemap-index-empty', 'sitemap', 'warning', 'Sitemap index is empty', 'No split sitemap entries were generated.', 'Check that pages are published, indexable and sitemap-enabled.', 2, { link: '/robots-txt' }));
  if (!crawl.robots?.text?.includes('Sitemap:')) checks.push(check('robots-no-sitemap', 'robots', 'warning', 'Robots.txt does not advertise sitemap', 'Search engines may still find URLs, but sitemap discovery is weaker.', 'Enable sitemap index in Robots & Sitemap Control.', 1, { link: '/robots-txt' }));
  if (/Disallow:\s*\/\s*$/m.test(crawl.robots?.text || '')) checks.push(check('robots-block-all', 'robots', 'error', 'Robots.txt blocks the whole site', 'The public robots file contains Disallow: / for all bots.', 'Do not go live until robots is changed to allow public pages.', 4, { link: '/robots-txt' }));

  checks.push(...redirectChainChecks(redirectItems));
  if (number(redirectSummary.inactive) > 0) checks.push(check('inactive-redirects', 'redirects', 'info', 'Inactive redirects exist', `${redirectSummary.inactive} redirect(s) are inactive.`, 'Review if old URLs should redirect before launch.', 1, { link: '/seo-redirects' }));
  if (redirectItems.length === 0) checks.push(check('no-redirects', 'redirects', 'info', 'No redirects configured', 'This may be fine for a new site, but old URLs will not be protected.', 'Add redirects for any old product/location URLs before launch.', 1, { link: '/seo-redirects' }));

  if (number(analyticsTotals.realMetricPages) === 0) checks.push(check('no-real-analytics', 'analytics', 'warning', 'No real SEO analytics imported', 'SEO Analytics is using estimated data only.', 'Connect Search Console and import real GSC metrics.', 2, { link: '/seo-search-console' }));
  if (!(searchConsole as any).status?.connected) checks.push(check('gsc-not-connected', 'analytics', 'warning', 'Google Search Console is not connected', 'Search Console import is needed for clicks, impressions, CTR and ranking data.', 'Connect Search Console and run a dry-run import.', 2, { link: '/seo-search-console' }));
  else checks.push(check('gsc-connected', 'analytics', 'pass', 'Search Console connected', 'Search Console settings are available for this tenant.', 'Keep importing data regularly.', 0, { link: '/seo-search-console' }));
  if (!analytics.integrations?.ga4Configured) checks.push(check('ga4-not-configured', 'analytics', 'info', 'GA4 not detected in env', 'GA4 or GTM may be configured through tenant tracking settings, but env config is not detected.', 'Check Tracking Settings and GA4 DebugView.', 1, { link: '/tracking-settings' }));

  if (number(linkSummary.orphanPages) > 0) checks.push(check('orphan-pages', 'internal-links', 'warning', 'Orphan SEO pages found', `${linkSummary.orphanPages} page(s) have no inbound internal links.`, 'Open Internal Linking and apply/review suggestions.', 2, { link: '/seo-internal-links' }));
  if (number(linkSummary.missingOutboundLinks) > 0) checks.push(check('weak-outbound-links', 'internal-links', 'warning', 'Pages missing outbound links', `${linkSummary.missingOutboundLinks} page(s) have fewer than 3 outbound links.`, 'Add links to products, locations, guides and quote routes.', 1, { link: '/seo-internal-links' }));
  if (number(linkSummary.orphanPages) === 0 && number(linkSummary.missingOutboundLinks) === 0) checks.push(check('internal-links-ok', 'internal-links', 'pass', 'Internal links look healthy', 'No orphan pages or weak outbound-link pages were found.', 'Keep reviewing internal links when new SEO pages are published.', 0, { link: '/seo-internal-links' }));

  if (number(contentSummary.urgent) > 0) checks.push(check('urgent-content-tasks', 'content', 'error', 'Urgent content tasks remain', `${contentSummary.urgent} urgent SEO content task(s) are still open or active.`, 'Fix urgent tasks before launch.', 3, { link: '/seo-content-queue' }));
  if (number(contentSummary.high) > 0) checks.push(check('high-content-tasks', 'content', 'warning', 'High-priority content tasks remain', `${contentSummary.high} high-priority task(s) remain.`, 'Work through high-priority content tasks before serious SEO push.', 2, { link: '/seo-content-queue' }));
  if (number(contentSummary.urgent) === 0 && number(contentSummary.high) === 0) checks.push(check('content-queue-ok', 'content', 'pass', 'No urgent/high content tasks', 'The content queue has no urgent or high-priority tasks.', 'Continue monitoring medium/low tasks.', 0, { link: '/seo-content-queue' }));

  const publicLandingPages = asArray(crawl.sitemaps?.all?.urls).filter((item: any) => ['products', 'locations', 'collections', 'guides', 'static'].includes(item.kind || '')).length;
  if (publicLandingPages < 5) checks.push(check('few-public-pages', 'storefront', 'warning', 'Few public SEO pages in sitemap', `${publicLandingPages} public SEO URL(s) are currently visible in sitemap.`, 'Publish reviewed product/location/collection/guide pages before launch.', 2, { link: '/seo-engine' }));
  else checks.push(check('public-pages-ok', 'storefront', 'pass', 'Public SEO pages available', `${publicLandingPages} public SEO URL(s) are sitemap-visible.`, 'Spot-check key URLs on the hosted theme.', 0, { link: '/seo-engine' }));

  const errors = checks.filter((item) => item.severity === 'error').length;
  const warnings = checks.filter((item) => item.severity === 'warning').length;
  const info = checks.filter((item) => item.severity === 'info').length;
  const pass = checks.filter((item) => item.severity === 'pass').length;
  const score = Math.max(0, Math.min(100, Math.round(100 - checks.reduce((sum, item) => sum + severityPenalty(item), 0))));
  const categories = ['crawl', 'sitemap', 'robots', 'metadata', 'schema', 'redirects', 'analytics', 'internal-links', 'content', 'storefront'] as SeoReadinessCategory[];

  return {
    score,
    grade: grade(score),
    status: readinessLabel(score, errors),
    ready: errors === 0 && score >= 75,
    generatedAt: new Date().toISOString(),
    counts: { pass, info, warnings, errors, total: checks.length },
    checks: checks.sort((a, b) => severityPenalty(b) - severityPenalty(a) || b.weight - a.weight),
    categories: categories.map((category) => {
      const items = checks.filter((item) => item.category === category);
      const catErrors = items.filter((item) => item.severity === 'error').length;
      const catWarnings = items.filter((item) => item.severity === 'warning').length;
      return { category, total: items.length, errors: catErrors, warnings: catWarnings, ready: catErrors === 0, checks: items };
    }),
    sourceSummaries: {
      crawl: crawl.summary,
      sitemaps: {
        all: crawl.sitemaps?.all?.count || 0,
        products: crawl.sitemaps?.products?.count || 0,
        locations: crawl.sitemaps?.locations?.count || 0,
        collections: crawl.sitemaps?.collections?.count || 0,
        guides: crawl.sitemaps?.guides?.count || 0,
        static: crawl.sitemaps?.static?.count || 0,
      },
      analytics: analytics.totals,
      searchConsole: (searchConsole as any).status,
      internalLinks: linkSummary,
      contentQueue: contentSummary,
      redirects: redirectSummary,
    },
    nextActions: checks.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 12).map((item) => ({ title: item.title, action: item.action, link: item.link, path: item.path, severity: item.severity })),
  };
}
