import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    api: 'public',
    version: 'v1',
    message: 'Public API v1 is available. Module endpoints require API credentials.',
  });
}
