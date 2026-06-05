import { NextResponse } from 'next/server';
import { resolveSeoForPath } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/';
    const meta = await resolveSeoForPath(request, path);
    return NextResponse.json({
      ok: true,
      source: 'internal-seo-schema-preview',
      data: {
        path: meta.path,
        pageType: meta.pageType,
        status: meta.status,
        schemaTypes: meta.schemaTypes,
        schemaJsonLd: meta.schemaJsonLd,
        schemaNodes: meta.schemaNodes,
        schemaWarnings: meta.schemaWarnings,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-schema-preview', error: error instanceof Error ? error.message : 'Failed to build schema preview.' }, { status: 500 });
  }
}
