import { NextResponse } from 'next/server';
import { deleteStoreDomainBinding, listStoreDomainBindings, saveStoreDomainBinding } from '@/core/storefront/store-domain-bindings.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listStoreDomainBindings();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store domains could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveStoreDomainBinding(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store domain could not be saved.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await deleteStoreDomainBinding(url.searchParams.get('domain') || '');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store domain could not be deleted.' }, { status: 400 });
  }
}
