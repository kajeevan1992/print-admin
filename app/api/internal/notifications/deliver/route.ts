export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { deliverNotification } from '@/core/notifications/notification-delivery.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-notification-delivery',
    error: error instanceof Error ? error.message : 'Notification delivery failed.',
  }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await deliverNotification(request, body);

    return NextResponse.json({
      ok: result.ok,
      source: 'internal-notification-delivery',
      data: result,
    });
  } catch (error) {
    return responseError(error);
  }
}
