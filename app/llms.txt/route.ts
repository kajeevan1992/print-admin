import { NextResponse } from 'next/server';
import { buildLlmsTxt } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const llms = await buildLlmsTxt(request).catch(() => ({ text: '# Holo Print\n\n> Design, print, sign and web support.\n', count: 0 }));
  return new NextResponse(llms.text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
