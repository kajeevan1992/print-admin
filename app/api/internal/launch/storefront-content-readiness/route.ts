import { NextResponse } from 'next/server';
import { buildRobotsTxt, buildSeoCrawlAudit, buildSitemapXml, resolveSeoForPath } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Check = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };

const DEFAULT_LAUNCH_PATHS = ['/', '/business-cards/sidcup', '/flyers/sidcup', '/leaflets/sidcup', '/banners/sidcup', '/posters/sidcup'];

function clean(value: unknown) {
  return String(value || '').trim();
}

function cleanPath(value: unknown) {
  const raw = clean(value) || '/';
  const path = raw.split('?')[0].split('#')[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function check(status: CheckStatus, id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string): Check {
  return { id, group, label, status, detail, action, data, href };
}
function pass(id: string, group: string, label: string, detail: string, data?: Record<string, any>, href?: string) { return check('pass', id, group, label, detail, undefined, data, href); }
function warn(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) { return check('warn', id, group, label, detail, action, data, href); }
function fail(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) { return check('fail', id, group, label, detail, action, data, href); }
function skip(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) { return check('skip', id, group, label, detail, action, data, href); }

function launchPathsFrom(request: Request) {
  const url = new URL(request.url);
  const productSlug = clean(url.searchParams.get('productSlug')) || 'business-cards';
  const locationSlug = clean(url.searchParams.get('locationSlug')) || 'sidcup';
  const supplied = clean(url.searchParams.get('paths'))
    .split(',')
    .map(cleanPath)
    .filter(Boolean);
  return unique([cleanPath('/'), `/${productSlug}/${locationSlug}`, ...DEFAULT_LAUNCH_PATHS, ...supplied].map(cleanPath));
}

function metaLengthChecks(path: string, meta: Record<string, any>): Check[] {
  const checks: Check[] = [];
  const title = clean(meta.title);
  const description = clean(meta.metaDescription);
  const prefix = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'home';
  if (!title) checks.push(fail(`title-${prefix}`, 'Storefront content', `${path} title`, 'Missing SEO title.', 'Add a clear SEO title before launch.', { path }, '/seo-engine'));
  else if (title.length < 20 || title.length > 70) checks.push(warn(`title-${prefix}`, 'Storefront content', `${path} title`, `SEO title is ${title.length} characters.`, 'Aim for a clear title around 30–60 characters.', { path, titleLength: title.length, title }, '/seo-engine'));
  else checks.push(pass(`title-${prefix}`, 'Storefront content', `${path} title`, `SEO title length looks usable (${title.length} characters).`, { path, titleLength: title.length, title }, '/seo-engine'));

  if (!description) checks.push(fail(`description-${prefix}`, 'Storefront content', `${path} meta description`, 'Missing meta description.', 'Add a customer-facing meta description before launch.', { path }, '/seo-engine'));
  else if (description.length < 70 || description.length > 170) checks.push(warn(`description-${prefix}`, 'Storefront content', `${path} meta description`, `Meta description is ${description.length} characters.`, 'Aim for a useful search snippet around 120–160 characters.', { path, descriptionLength: description.length, description }, '/seo-engine'));
  else checks.push(pass(`description-${prefix}`, 'Storefront content', `${path} meta description`, `Meta description length looks usable (${description.length} characters).`, { path, descriptionLength: description.length, description }, '/seo-engine'));
  return checks;
}

function pageChecks(path: string, meta: Record<string, any>) {
  const checks: Check[] = [];
  const prefix = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'home';
  if (meta.noIndex || String(meta.robots || '').includes('noindex')) checks.push(fail(`indexable-${prefix}`, 'Storefront content', `${path} indexability`, `${path} is noindex.`, 'Publish the page or remove noindex before sending real traffic.', { path, robots: meta.robots }, '/seo-engine'));
  else checks.push(pass(`indexable-${prefix}`, 'Storefront content', `${path} indexability`, `${path} is indexable.`, { path, robots: meta.robots }, '/seo-engine'));

  if (!meta.found) checks.push(warn(`saved-seo-${prefix}`, 'Storefront content', `${path} saved SEO record`, `${path} is using fallback SEO content.`, 'Create/publish a saved SEO page for launch-critical pages.', { path }, '/seo-engine'));
  else if (meta.status !== 'published') checks.push(fail(`saved-seo-${prefix}`, 'Storefront content', `${path} saved SEO record`, `${path} exists but is ${meta.status}.`, 'Publish this SEO page before launch.', { path, status: meta.status }, '/seo-engine'));
  else checks.push(pass(`saved-seo-${prefix}`, 'Storefront content', `${path} saved SEO record`, `${path} has a published SEO record.`, { path, status: meta.status }, '/seo-engine'));

  if (!clean(meta.h1)) checks.push(warn(`h1-${prefix}`, 'Storefront content', `${path} H1`, `${path} does not have a saved H1.`, 'Add a clear H1 for the customer landing page.', { path }, '/seo-engine'));
  else checks.push(pass(`h1-${prefix}`, 'Storefront content', `${path} H1`, `${path} has an H1: ${meta.h1}.`, { path, h1: meta.h1 }, '/seo-engine'));

  if (!clean(meta.canonicalUrl).startsWith('http')) checks.push(warn(`canonical-${prefix}`, 'Storefront content', `${path} canonical`, `${path} canonical URL is missing or not absolute.`, 'Set a full canonical URL for this page.', { path, canonicalUrl: meta.canonicalUrl }, '/seo-engine'));
  else checks.push(pass(`canonical-${prefix}`, 'Storefront content', `${path} canonical`, `${path} has an absolute canonical URL.`, { path, canonicalUrl: meta.canonicalUrl }, '/seo-engine'));

  const schemaCount = Array.isArray(meta.schemaNodes) ? meta.schemaNodes.length : Array.isArray(meta.schemaTypes) ? meta.schemaTypes.length : 0;
  if (!schemaCount) checks.push(warn(`schema-${prefix}`, 'Storefront content', `${path} schema`, `${path} does not expose schema data.`, 'Add WebPage/Product/LocalBusiness schema where relevant.', { path }, '/seo-engine'));
  else checks.push(pass(`schema-${prefix}`, 'Storefront content', `${path} schema`, `${path} has ${schemaCount} schema node(s)/type(s).`, { path, schemaCount, schemaTypes: meta.schemaTypes || [] }, '/seo-engine'));

  checks.push(...metaLengthChecks(path, meta));
  return checks;
}

export async function GET(request: Request) {
  const startedAt = new Date().toISOString();
  const checks: Check[] = [];
  try {
    const paths = launchPathsFrom(request);
    const [audit, sitemap, robots] = await Promise.all([
      buildSeoCrawlAudit(request),
      buildSitemapXml(request),
      buildRobotsTxt(request),
    ]);

    if (audit.summary.errors > 0) checks.push(fail('crawl-audit-errors', 'SEO crawl', 'Crawl audit errors', `${audit.summary.errors} SEO crawl error(s) found.`, 'Open SEO Engine and fix crawl errors before public launch.', { summary: audit.summary, issues: audit.issues.filter((item: any) => item.severity === 'error').slice(0, 10) }, '/seo-engine'));
    else checks.push(pass('crawl-audit-errors', 'SEO crawl', 'Crawl audit errors', 'No SEO crawl errors found.', { summary: audit.summary }, '/seo-engine'));

    if (audit.summary.warnings > 0) checks.push(warn('crawl-audit-warnings', 'SEO crawl', 'Crawl audit warnings', `${audit.summary.warnings} SEO crawl warning(s) found.`, 'Review duplicate/missing SEO fields before launch.', { summary: audit.summary, issues: audit.issues.filter((item: any) => item.severity === 'warning').slice(0, 10) }, '/seo-engine'));
    else checks.push(pass('crawl-audit-warnings', 'SEO crawl', 'Crawl audit warnings', 'No SEO crawl warnings found.', { summary: audit.summary }, '/seo-engine'));

    if (sitemap.count > 0) checks.push(pass('sitemap-output', 'SEO crawl', 'Sitemap output', `${sitemap.count} indexable URL(s) are present in sitemap.xml.`, { count: sitemap.count, sample: sitemap.urls.slice(0, 8) }, '/sitemap.xml'));
    else checks.push(fail('sitemap-output', 'SEO crawl', 'Sitemap output', 'Sitemap has no indexable URLs.', 'Publish SEO pages and make sure they are included in the sitemap.', { count: 0 }, '/seo-engine'));

    if (robots.text.includes('Disallow: /\n') && !robots.text.includes('Allow: /')) checks.push(fail('robots-public-access', 'SEO crawl', 'robots.txt public access', 'robots.txt blocks all crawling.', 'Enable robots access before public launch.', { robots: robots.text.slice(0, 1000) }, '/robots-txt'));
    else checks.push(pass('robots-public-access', 'SEO crawl', 'robots.txt public access', 'robots.txt does not appear to block all public crawling.', { blocked: robots.blocked.slice(0, 20) }, '/robots-txt'));

    const metas = await Promise.all(paths.map(async (path) => ({ path, meta: await resolveSeoForPath(request, path) })));
    for (const item of metas) checks.push(...pageChecks(item.path, item.meta as Record<string, any>));

    const fallbackCount = metas.filter((item) => !(item.meta as any).found).length;
    if (fallbackCount) checks.push(warn('fallback-content-count', 'Storefront content', 'Fallback content usage', `${fallbackCount} launch-critical page(s) use fallback SEO content.`, 'Save/publish SEO records for the launch-critical customer landing pages.', { fallbackPaths: metas.filter((item) => !(item.meta as any).found).map((item) => item.path) }, '/seo-engine'));
    else checks.push(pass('fallback-content-count', 'Storefront content', 'Fallback content usage', 'All checked launch-critical pages have saved SEO records.', { paths }, '/seo-engine'));

    const summary = {
      total: checks.length,
      pass: checks.filter((item) => item.status === 'pass').length,
      warn: checks.filter((item) => item.status === 'warn').length,
      fail: checks.filter((item) => item.status === 'fail').length,
      skip: checks.filter((item) => item.status === 'skip').length,
    };
    const score = Math.max(0, Math.round(((summary.pass + summary.skip * 0.5) / Math.max(1, summary.total)) * 100));
    const launchStatus = summary.fail > 0 ? 'blocked' : summary.warn > 0 ? 'review' : 'ready';
    return NextResponse.json({ ok: summary.fail === 0, source: 'internal-storefront-content-readiness', data: { launchStatus, score, summary, paths, checks, audit: audit.summary, sitemap: { count: sitemap.count, sample: sitemap.urls.slice(0, 12) }, robots: { blocked: robots.blocked.slice(0, 20) }, mode: 'read-only', startedAt, finishedAt: new Date().toISOString() } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-content-readiness', error: error instanceof Error ? error.message : 'Storefront content readiness failed.' }, { status: 500 });
  }
}
