import { NextResponse } from 'next/server';
import { listPlatformThemes, savePlatformTheme, saveThemeAssignment } from '@/core/themes/platform-theme-library.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listPlatformThemes();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme library could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = body.kind === 'assignment' ? await saveThemeAssignment(body) : await savePlatformTheme(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme library could not be saved.' }, { status: 400 });
  }
}
