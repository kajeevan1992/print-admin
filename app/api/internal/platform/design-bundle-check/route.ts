import { NextResponse } from 'next/server';
import { validateThemeZipManifest } from '@/core/themes/platform-theme-library.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = validateThemeZipManifest(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Design bundle check failed.' }, { status: 400 });
  }
}
