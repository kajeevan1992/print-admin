import { NextResponse } from 'next/server';
import { superAdminStore } from '@/core/platform/super-admin-store';

export async function GET() {
  return NextResponse.json({ ok: true, data: { items: superAdminStore.listTenants() } });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ ok: true, data: superAdminStore.saveTenant(body) });
}
