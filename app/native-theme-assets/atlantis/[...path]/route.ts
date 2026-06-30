import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ path?: string[] }> };

function contentType(pathname: string, upstreamType: string) {
  if (upstreamType) return upstreamType;
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function GET(_request: Request, { params }: Params) {
  const { path = [] } = await params;
  const safe = path.map((part) => encodeURIComponent(String(part || '').replace(/\.+/g, ''))).filter(Boolean).join('/');
  if (!safe) return new NextResponse('Not found', { status: 404 });
  const upstream = await fetch(`https://hosted-theme.vercel.app/images/${safe}`, { cache: 'force-cache' });
  if (!upstream.ok) return new NextResponse('Not found', { status: 404 });
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, { headers: { 'content-type': contentType(safe, upstream.headers.get('content-type') || ''), 'cache-control': 'public, max-age=3600' } });
}
