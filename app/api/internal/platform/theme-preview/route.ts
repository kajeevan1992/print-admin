import { NextResponse } from 'next/server';
import { createThemePreviewSnapshot, getThemePreviewSnapshot } from '@/core/themes/theme-package-storage.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getThemePreviewSnapshot(url.searchParams.get('previewId') || '');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme preview could not load.' }, { status: 404 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await createThemePreviewSnapshot(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme preview could not be created.' }, { status: 400 });
  }
}
