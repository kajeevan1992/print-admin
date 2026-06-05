import { NextResponse } from 'next/server';
import { buildCollectionNotification, listCollectionNotifications, queueCollectionNotification } from '@/core/collection/collection-notifications.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId') || '';
    if (orderId) {
      const preview = await buildCollectionNotification(request, orderId, { email: url.searchParams.get('email') || '', force: url.searchParams.get('force') === 'true' });
      return NextResponse.json({ ok: preview.ok, source: 'internal-collection-notifications', data: preview, error: preview.ok ? undefined : preview.reason });
    }
    const data = await listCollectionNotifications(request, { search: url.searchParams.get('search') || '', status: url.searchParams.get('status') || 'all' });
    return NextResponse.json({ ok: true, source: 'internal-collection-notifications', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-notifications', error: error instanceof Error ? error.message : 'Failed to load collection notifications.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || body.orderNumber || '').trim();
    if (!orderId) return NextResponse.json({ ok: false, source: 'internal-collection-notifications', error: 'orderId is required.' }, { status: 400 });
    const queued = await queueCollectionNotification(request, orderId, { email: body.email, force: Boolean(body.force), sendWhenNotReady: Boolean(body.sendWhenNotReady), createdBy: 'collection-notifications-api' });
    return NextResponse.json({ ok: queued.ok, source: 'internal-collection-notifications', data: queued, error: queued.ok ? undefined : queued.reason }, { status: queued.ok ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-notifications', error: error instanceof Error ? error.message : 'Failed to queue collection notification.' }, { status: 500 });
  }
}
