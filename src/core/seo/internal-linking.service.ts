import { listSeoPages, saveSeoPage, type SeoPageRecord } from './seo-engine.service';

type InternalLink = { label: string; href: string };

export type InternalLinkSuggestion = {
  label: string;
  href: string;
  targetPath: string;
  targetPageType: string;
  reason: string;
  score: number;
  relation: 'product-parent' | 'product-area' | 'same-location' | 'collection' | 'guide' | 'quote' | 'related';
};

export type InternalLinkPageAnalysis = {
  page: SeoPageRecord;
  path: string;
  outboundLinks: InternalLink[];
  inboundLinks: Array<{ fromPath: string; label: string }>;
  outboundCount: number;
  inboundCount: number;
  isOrphan: boolean;
  missingOutboundLinks: boolean;
  suggestions: InternalLinkSuggestion[];
};

function cleanPath(value: string) {
  const raw = String(value || '/').trim() || '/';
  try { if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname || '/'; } catch {}
  const clean = raw.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function norm(value: string) {
  return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function words(value: string) {
  return norm(value).split(/\s+/).filter((word) => word.length > 2);
}

function cleanLinks(links: InternalLink[] = []) {
  const seen = new Set<string>();
  return links
    .filter((link) => link?.href && link?.label)
    .map((link) => ({ label: String(link.label).trim(), href: cleanPath(link.href) }))
    .filter((link) => {
      const key = cleanPath(link.href);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pageTitle(page: SeoPageRecord) {
  return page.h1 || page.productName || page.locationName || page.title || page.path;
}

function targetLabel(source: SeoPageRecord, target: SeoPageRecord, relation: InternalLinkSuggestion['relation']) {
  if (relation === 'product-parent') return target.productName ? `Order ${target.productName}` : pageTitle(target);
  if (relation === 'product-area') return target.locationName && target.productName ? `${target.productName} in ${target.locationName}` : pageTitle(target);
  if (relation === 'same-location') return target.locationName ? `Printing in ${target.locationName}` : pageTitle(target);
  if (relation === 'collection') return target.locationName ? `Collection in ${target.locationName}` : pageTitle(target);
  if (relation === 'guide') return target.h1 || 'Artwork and print guide';
  if (relation === 'quote') return 'Request a bespoke quote';
  return pageTitle(target);
}

function sameProduct(a: SeoPageRecord, b: SeoPageRecord) {
  if (!a.productName || !b.productName) return false;
  const aw = new Set(words(a.productName));
  return words(b.productName).some((word) => aw.has(word));
}

function sameLocation(a: SeoPageRecord, b: SeoPageRecord) {
  if (!a.locationName || !b.locationName) return false;
  return norm(a.locationName) === norm(b.locationName);
}

function sharedKeyword(a: SeoPageRecord, b: SeoPageRecord) {
  const aw = new Set(words([a.targetKeyword, a.title, a.productName || '', a.locationName || ''].join(' ')));
  return words([b.targetKeyword, b.title, b.productName || '', b.locationName || ''].join(' ')).filter((word) => aw.has(word)).length;
}

function scoreRelation(source: SeoPageRecord, target: SeoPageRecord): { score: number; relation: InternalLinkSuggestion['relation']; reason: string } | null {
  if (cleanPath(source.path) === cleanPath(target.path)) return null;
  let score = 0;
  let relation: InternalLinkSuggestion['relation'] = 'related';
  let reason = 'Related SEO page.';

  if (source.pageType === 'product-location' && target.pageType === 'product' && sameProduct(source, target)) {
    score = 96; relation = 'product-parent'; reason = 'Product-location page should link back to the main product page.';
  } else if (source.pageType === 'product' && target.pageType === 'product-location' && sameProduct(source, target)) {
    score = 88; relation = 'product-area'; reason = 'Main product page should link to relevant local product pages.';
  } else if (sameLocation(source, target) && ['location', 'service-area'].includes(target.pageType)) {
    score = 84; relation = 'same-location'; reason = 'Same location/area page strengthens local SEO clusters.';
  } else if (sameLocation(source, target) && target.pageType === 'collection-point') {
    score = 82; relation = 'collection'; reason = 'Same-area collection point is useful for local fulfilment.';
  } else if (target.pageType === 'guide' && (source.pageType === 'product' || source.pageType === 'product-location')) {
    score = 72; relation = 'guide'; reason = 'Product pages should link to helpful artwork/print guides.';
  } else if (source.pageType === 'guide' && (target.pageType === 'product' || target.pageType === 'product-location')) {
    score = 74; relation = 'guide'; reason = 'Guides should link to matching orderable products.';
  } else if (target.path === '/bespoke-quote') {
    score = 68; relation = 'quote'; reason = 'Bespoke quote page is useful for complex/custom print jobs.';
  } else {
    const shared = sharedKeyword(source, target);
    if (shared > 0) {
      score = Math.min(64 + shared * 5, 78); relation = 'related'; reason = 'Pages share product, location or keyword terms.';
    }
  }

  if (!score) return null;
  if (target.status !== 'published') score -= 10;
  if (target.noIndex) score -= 25;
  if (source.pageType === 'collection-point' && target.pageType === 'collection-point') score -= 30;
  if (source.pageType === 'service-area' && target.pageType === 'location' && !sameLocation(source, target)) score -= 20;
  if (score < 45) return null;
  return { score, relation, reason };
}

function buildSuggestion(source: SeoPageRecord, target: SeoPageRecord): InternalLinkSuggestion | null {
  const scored = scoreRelation(source, target);
  if (!scored) return null;
  const href = cleanPath(target.path);
  return {
    label: targetLabel(source, target, scored.relation),
    href,
    targetPath: href,
    targetPageType: target.pageType,
    reason: scored.reason,
    score: scored.score,
    relation: scored.relation,
  };
}

function addFallbackSuggestions(source: SeoPageRecord, suggestions: InternalLinkSuggestion[], pathMap: Map<string, SeoPageRecord>) {
  const fallbackPaths = ['/all-products', '/bespoke-quote', '/artwork-upload', '/contact'];
  const existing = new Set(suggestions.map((item) => cleanPath(item.href)));
  for (const path of fallbackPaths) {
    if (existing.has(path) || cleanPath(source.path) === path) continue;
    const target = pathMap.get(path);
    if (!target) continue;
    suggestions.push({
      label: path === '/all-products' ? 'Browse all print products' : path === '/bespoke-quote' ? 'Request a bespoke quote' : path === '/artwork-upload' ? 'Upload artwork' : 'Contact Holo Print',
      href: path,
      targetPath: path,
      targetPageType: target.pageType,
      reason: 'Fallback navigation link for users and crawlers.',
      score: path === '/all-products' ? 62 : 58,
      relation: path === '/bespoke-quote' ? 'quote' : 'related',
    });
  }
}

function inboundMap(pages: SeoPageRecord[]) {
  const map = new Map<string, Array<{ fromPath: string; label: string }>>();
  for (const page of pages) {
    const fromPath = cleanPath(page.path);
    for (const link of cleanLinks(page.internalLinks || [])) {
      const href = cleanPath(link.href);
      map.set(href, [...(map.get(href) || []), { fromPath, label: link.label }]);
    }
  }
  return map;
}

export async function buildInternalLinkingDashboard(request: Request, filters: { status?: string; pageType?: string; search?: string; limit?: number; minScore?: number } = {}) {
  const data = await listSeoPages(request, { status: filters.status || 'all', pageType: filters.pageType || 'all', search: filters.search || '' });
  const all = await listSeoPages(request, { status: 'all' });
  const pathMap = new Map(all.items.map((page) => [cleanPath(page.path), page]));
  const inbound = inboundMap(all.items);
  const minScore = Number(filters.minScore || 55);
  const limit = Math.max(1, Math.min(Number(filters.limit || 6), 20));

  const rows: InternalLinkPageAnalysis[] = data.items.map((page) => {
    const path = cleanPath(page.path);
    const outboundLinks = cleanLinks(page.internalLinks || []);
    const existing = new Set(outboundLinks.map((link) => cleanPath(link.href)));
    const suggestions = all.items
      .map((target) => buildSuggestion(page, target))
      .filter((item): item is InternalLinkSuggestion => Boolean(item))
      .filter((item) => !existing.has(cleanPath(item.href)))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score);
    addFallbackSuggestions(page, suggestions, pathMap);
    const unique = new Map<string, InternalLinkSuggestion>();
    for (const suggestion of suggestions.sort((a, b) => b.score - a.score)) {
      if (!unique.has(cleanPath(suggestion.href))) unique.set(cleanPath(suggestion.href), suggestion);
    }
    const inboundLinks = inbound.get(path) || [];
    return {
      page,
      path,
      outboundLinks,
      inboundLinks,
      outboundCount: outboundLinks.length,
      inboundCount: inboundLinks.length,
      isOrphan: inboundLinks.length === 0 && page.pageType !== 'home',
      missingOutboundLinks: outboundLinks.length < 3,
      suggestions: [...unique.values()].slice(0, limit),
    };
  });

  rows.sort((a, b) => Number(b.isOrphan) - Number(a.isOrphan) || Number(b.missingOutboundLinks) - Number(a.missingOutboundLinks) || b.suggestions.length - a.suggestions.length);

  return {
    rows,
    summary: {
      pages: rows.length,
      orphanPages: rows.filter((row) => row.isOrphan).length,
      missingOutboundLinks: rows.filter((row) => row.missingOutboundLinks).length,
      suggestions: rows.reduce((sum, row) => sum + row.suggestions.length, 0),
      publishedPages: rows.filter((row) => row.page.status === 'published').length,
      draftPages: rows.filter((row) => row.page.status === 'draft').length,
    },
  };
}

export async function applyInternalLinkSuggestions(request: Request, input: { paths?: string[]; applyAll?: boolean; onlyMissing?: boolean; maxPerPage?: number; minScore?: number; status?: string; pageType?: string; search?: string } = {}) {
  const dashboard = await buildInternalLinkingDashboard(request, { status: input.status || 'all', pageType: input.pageType || 'all', search: input.search || '', minScore: input.minScore || 55, limit: input.maxPerPage || 6 });
  const selected = new Set((input.paths || []).map(cleanPath));
  const maxPerPage = Math.max(1, Math.min(Number(input.maxPerPage || 4), 12));
  const changed = [] as SeoPageRecord[];
  const skipped = [] as Array<{ path: string; reason: string }>;

  for (const row of dashboard.rows) {
    if (!input.applyAll && selected.size && !selected.has(row.path)) continue;
    if (!input.applyAll && !selected.size) continue;
    if (input.onlyMissing && !row.missingOutboundLinks) { skipped.push({ path: row.path, reason: 'Page already has enough outbound links.' }); continue; }
    const suggestions = row.suggestions.slice(0, maxPerPage);
    if (!suggestions.length) { skipped.push({ path: row.path, reason: 'No suggestions available.' }); continue; }
    const existing = cleanLinks(row.page.internalLinks || []);
    const hrefs = new Set(existing.map((link) => cleanPath(link.href)));
    const additions = suggestions
      .map((item) => ({ label: item.label, href: cleanPath(item.href) }))
      .filter((link) => {
        if (hrefs.has(link.href)) return false;
        hrefs.add(link.href);
        return true;
      });
    if (!additions.length) { skipped.push({ path: row.path, reason: 'Suggestions are already linked.' }); continue; }
    const saved = await saveSeoPage(request, {
      ...row.page,
      internalLinks: [...existing, ...additions].slice(0, 20),
      metadata: {
        ...(row.page.metadata || {}),
        internalLinkingAppliedAt: new Date().toISOString(),
        internalLinkingAdded: additions,
      },
    });
    changed.push(saved);
  }

  return { changed, skipped, count: changed.length };
}
