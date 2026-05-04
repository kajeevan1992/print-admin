import { NextResponse } from 'next/server';
import { superAdminStore } from '@/core/platform/super-admin-store';

export async function GET() {
  return NextResponse.json({ ok: true, data: { items: superAdminStore.listDemoUploads() } });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ ok: true, data: superAdminStore.saveDemoUpload(body) });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: { message: 'Demo upload id is required.' } }, { status: 400 });
  return NextResponse.json({ ok: true, data: superAdminStore.deleteDemoUpload(id) });
}
