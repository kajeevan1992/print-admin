import { NextResponse } from 'next/server';
import { listSeoPages, type SeoPageRecord } from '@/core/seo/seo-engine.service';
import { buildSeoSchemaJsonLd } from '@/core/seo/seo-schema-generator.service';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');
const DEFAULT_OG_IMAGE = process.env.SEO_DEFAULT_OG_IMAGE || `${SITE_URL}/og-image.jpg`;

function cleanPath(value: string) {
  const path = String(value || '').trim() || '/';
  const clean = path.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function canonical(path: string) {
  const clean = cleanPath(path);
  return `${SITE_URL}${clean === '/' ? '' : clean}`;
}

function isStaticEligible(page: SeoPageRecord) {
  if (page.status !== 'published') return false;
  if (page.noIndex) return false;
  if (!page.path || page.path.startsWith('/checkout') || page.path.startsWith('/account') || page.path.startsWith('/api')) return false;
  return true;
}

function socialFor(page: SeoPageRecord) {
  return {
    ogTitle: page.ogTitle || page.title,
    ogDescription: page.ogDescription || page.metaDescription,
    ogImage: page.ogImage || page.twitterImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterTitle: page.twitterTitle || page.ogTitle || page.title,
    twitterDescription: page.twitterDescription || page.ogDescription || page.metaDescription,
    twitterImage: page.twitterImage || page.ogImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterCard: page.twitterCard || 'summary_large_image',
  };
}

function toStaticRecord(page: SeoPageRecord) {
  const clean = cleanPath(page.path);
  const noIndex = page.noIndex || page.status !== 'published';
  const noFollow = page.noFollow;
  const social = socialFor(page);
  const meta = {
    id: page.id,
    slug: page.slug,
    path: clean,
    pageType: page.pageType,
    status: page.status,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.h1,
    canonicalUrl: page.canonicalUrl || canonical(clean),
    robots: `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`,
    noIndex,
    noFollow,
    includeInSitemap: page.includeInSitemap,
    schemaTypes: page.schemaTypes,
    targetKeyword: page.targetKeyword,
    productName: page.productName,
    locationName: page.locationName,
    introCopy: page.introCopy,
    faqItems: page.faqItems || [],
    internalLinks: page.internalLinks || [],
    ...social,
    metadata: page.metadata || {},
  };
  const schema = buildSeoSchemaJsonLd(meta);
  return {
    ...meta,
    schemaJsonLd: schema.graph,
    schemaNodes: schema.nodes,
    schemaWarnings: schema.warnings,
    staticHtmlEligible: isStaticEligible(page),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeDrafts = url.searchParams.get('includeDrafts') === 'true';
    const includeNoIndex = url.searchParams.get('includeNoIndex') === 'true';
    const max = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 500), 2000));
    const data = await listSeoPages(request, { status: includeDrafts ? 'all' : 'published' });
    const pages = data.items
      .filter((page) => includeNoIndex || isStaticEligible(page))
      .slice(0, max)
      .map(toStaticRecord);
    return NextResponse.json({
      ok: true,
      source: 'internal-seo-static-export',
      data: {
        siteUrl: SITE_URL,
        generatedAt: new Date().toISOString(),
        count: pages.length,
        pages,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-static-export', error: error instanceof Error ? error.message : 'Failed to export static SEO metadata.' }, { status: 500 });
  }
}
