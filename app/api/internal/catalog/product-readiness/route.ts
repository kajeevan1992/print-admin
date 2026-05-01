import { NextResponse } from 'next/server';
import { listProductReadiness, applyProductPublishPatch } from '@/core/storefront/product-publish-readiness';

export async function GET(request: Request) {
  try {
    const data = await listProductReadiness(request);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Readiness check failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await applyProductPublishPatch(request, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Publish patch failed.' } }, { status: 400 });
  }
}
