import { NextResponse } from 'next/server';
import { listThemePackages, storeThemeZipPackage } from '@/core/themes/theme-package-storage.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listThemePackages(url.searchParams.get('themeKey') || undefined);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme bundles could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Upload a ZIP file in the file field.');
    const data = await storeThemeZipPackage(file);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme bundle upload failed.' }, { status: 400 });
  }
}
