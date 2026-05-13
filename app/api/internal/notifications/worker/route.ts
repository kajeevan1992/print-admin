export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processNotificationQueue } from '@/core/notifications/notification-delivery.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-notification-worker',
    error: error instanceof Error ? error.message : 'Notification worker failed.',
  }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processNotificationQueue(request, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-notification-worker',
      data: result,
    });
  } catch (error) {
    return responseError(error);
  }
}
