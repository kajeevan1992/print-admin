import { NextResponse } from 'next/server';
import { buildRobotsTxt } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const robots = await buildRobotsTxt(request).catch(() => ({ text: 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /api/internal/\nSitemap: https://holoprint.co.uk/sitemap.xml\n' }));
  return new NextResponse(robots.text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
