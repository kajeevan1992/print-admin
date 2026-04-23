import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: [],
    message: 'Server-side encrypted database connection storage will be connected in the next unified core pass.',
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return NextResponse.json({
    ok: true,
    data: body,
    message: 'Connection received. Persistent encrypted storage is planned for the next unified core pass.',
  });
}
