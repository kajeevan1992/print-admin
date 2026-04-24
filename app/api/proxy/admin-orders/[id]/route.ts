import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function disabled() {
  return NextResponse.json(
    {
      ok: false,
      error: 'LEGACY_PROXY_DISABLED',
      message:
        'Legacy /api/proxy routes are disabled in unified-core mode. Internal app modules should use core services; external clients should use versioned /api/v1 routes with API credentials.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return disabled();
}

export async function POST() {
  return disabled();
}

export async function PUT() {
  return disabled();
}

export async function PATCH() {
  return disabled();
}

export async function DELETE() {
  return disabled();
}
