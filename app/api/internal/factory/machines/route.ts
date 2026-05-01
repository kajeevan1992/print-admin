import { NextResponse } from 'next/server';
import { readMachineStatus, updateMachineStatus } from '@/core/storefront/machine-status';

export async function GET(request: Request) {
  try {
    const data = await readMachineStatus(request);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Machine status failed.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await updateMachineStatus(request, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Machine status update failed.' } }, { status: 400 });
  }
}
