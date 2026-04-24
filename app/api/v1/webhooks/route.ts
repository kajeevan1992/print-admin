import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publicFail, publicJson } from '@/core/api/public-api-routing';
import { createWebhookEndpoint, listWebhookEndpoints, type WebhookEvent } from '@/core/webhooks/webhook.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requirePublicApiCredentials(request, ['webhooks:write']);
  if (!auth.ok) return auth.response;
  return publicJson({ items: listWebhookEndpoints({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }) });
}

export async function POST(request: Request) {
  const auth = requirePublicApiCredentials(request, ['webhooks:write']);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { url?: string; events?: WebhookEvent[] } | null;
  if (!body?.url || !Array.isArray(body.events)) return publicFail('INVALID_WEBHOOK_INPUT', 'url and events are required.', 400);
  try { return publicJson(createWebhookEndpoint({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }, { url: body.url, events: body.events }), { status: 201 }); }
  catch (error) { return publicFail('INVALID_WEBHOOK_INPUT', error instanceof Error ? error.message : 'Invalid webhook input.', 400); }
}
