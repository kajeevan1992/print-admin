import { NextResponse } from 'next/server';
import { getHostedThemeSettings, publishHostedTheme, saveHostedThemeDraft } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getHostedThemeSettings(url.searchParams.get('channelSlug') || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme settings could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = body.action === 'publish' ? await publishHostedTheme(body.channelSlug || 'default-store') : await saveHostedThemeDraft(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme settings could not be saved.' }, { status: 400 });
  }
}
