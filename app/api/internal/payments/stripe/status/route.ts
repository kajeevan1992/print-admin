import { NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { stripePublicConfig } from '@/core/payments/stripe.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const CONFIG_RESOURCE = 'admin-config' as any;
const WEBHOOK_EVENTS_KEY = 'stripe-webhook-events';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function appBase(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
async function recentWebhookEvents(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, WEBHOOK_EVENTS_KEY);
    const events = (record as any)?.metadataJson?.events;
    return Array.isArray(events) ? events.slice(0, 10) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const publicConfig = stripePublicConfig();
    const webhookSecretConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    const events = await recentWebhookEvents(request).catch(() => []);
    const webhookUrl = `${appBase(request)}/api/webhooks/stripe`;
    const checks = [
      { key: 'secretKey', label: 'Stripe secret key configured', ok: publicConfig.enabled },
      { key: 'publishableKey', label: 'Stripe publishable key configured', ok: Boolean(publicConfig.publishableKey) },
      { key: 'webhookSecret', label: 'Stripe webhook signing secret configured', ok: webhookSecretConfigured },
      { key: 'webhookEndpoint', label: 'Webhook endpoint available', ok: true, value: webhookUrl },
      { key: 'recentEvents', label: 'Recent webhook events recorded', ok: events.length > 0, value: events.length },
    ];
    const requiredEvents = [
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'refund.created',
      'refund.updated',
    ];
    const readyForLivePayments = publicConfig.enabled && Boolean(publicConfig.publishableKey) && webhookSecretConfigured;
    return json({ ok: true, source: 'internal-stripe-launch-status', mode: publicConfig.mode, readyForLivePayments, webhookUrl, requiredEvents, checks, recentWebhookEvents: events });
  } catch (error) {
    return json({ ok: false, source: 'internal-stripe-launch-status', error: error instanceof Error ? error.message : 'Stripe launch status failed.' }, { status: 500 });
  }
}
