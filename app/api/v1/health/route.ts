import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    api: 'public',
    version: 'v1',
    message: 'Public API v1 shell is live. External modules will be exposed here as the platform grows.',
  });
}
