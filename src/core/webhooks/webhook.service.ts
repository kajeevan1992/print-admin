import crypto from 'crypto';
import type { TenantContext } from '../tenant/types';

export type WebhookEvent = 'order.created' | 'order.updated' | 'catalog.updated' | 'artwork.updated';
export type WebhookEndpoint = { id: string; tenantId: string; siteId?: string; url: string; events: WebhookEvent[]; secretPreview: string; status: 'active' | 'paused'; createdAt: string; updatedAt: string };
const endpoints = new Map<string, WebhookEndpoint>();
const now = () => new Date().toISOString();

function validUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:'; } catch { return false; } }
export function listWebhookEndpoints(ctx: TenantContext) { return [...endpoints.values()].filter((item) => item.tenantId === ctx.tenantId && (!ctx.siteId || item.siteId === ctx.siteId)); }
export function createWebhookEndpoint(ctx: TenantContext, input: { url: string; events: WebhookEvent[] }) {
  if (!validUrl(input.url)) throw new Error('Webhook url must be a valid https URL.');
  if (!Array.isArray(input.events) || input.events.length === 0) throw new Error('At least one webhook event is required.');
  const createdAt = now();
  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
  const endpoint: WebhookEndpoint = { id: `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, tenantId: ctx.tenantId, siteId: ctx.siteId, url: input.url, events: input.events, secretPreview: `${secret.slice(0, 12)}••••`, status: 'active', createdAt, updatedAt: createdAt };
  endpoints.set(endpoint.id, endpoint);
  return { endpoint, signingSecret: secret };
}
export function updateWebhookEndpoint(ctx: TenantContext, id: string, input: Partial<{ url: string; events: WebhookEvent[]; status: 'active' | 'paused' }>) {
  const current = endpoints.get(id);
  if (!current || current.tenantId !== ctx.tenantId) return null;
  if (input.url && !validUrl(input.url)) throw new Error('Webhook url must be a valid https URL.');
  const next: WebhookEndpoint = { ...current, ...input, updatedAt: now() };
  endpoints.set(id, next);
  return next;
}
export function deleteWebhookEndpoint(ctx: TenantContext, id: string) { const current = endpoints.get(id); if (!current || current.tenantId !== ctx.tenantId) return false; endpoints.delete(id); return true; }
