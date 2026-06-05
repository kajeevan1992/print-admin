import type { Metadata } from 'next';

export type ResolvedSeoMeta = {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | string;
};

export function resolvedSeoToNextMetadata(meta: ResolvedSeoMeta): Metadata {
  const robots = {
    index: !meta.noIndex && !String(meta.robots || '').includes('noindex'),
    follow: !meta.noFollow && !String(meta.robots || '').includes('nofollow'),
  };

  return {
    title: meta.title,
    description: meta.metaDescription,
    alternates: meta.canonicalUrl ? { canonical: meta.canonicalUrl } : undefined,
    robots,
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.metaDescription,
      url: meta.canonicalUrl,
      images: meta.ogImage ? [{ url: meta.ogImage }] : undefined,
      type: 'website',
    },
    twitter: {
      card: meta.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      title: meta.twitterTitle || meta.ogTitle || meta.title,
      description: meta.twitterDescription || meta.ogDescription || meta.metaDescription,
      images: meta.twitterImage || meta.ogImage ? [meta.twitterImage || meta.ogImage || ''] : undefined,
    },
  };
}

export function seoJsonLdScript(schemaJsonLd: unknown) {
  if (!schemaJsonLd) return null;
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schemaJsonLd) },
  };
}
