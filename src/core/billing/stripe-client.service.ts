import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;
export function stripeEnv(name: string) { return String(process.env[name] || '').trim(); }
export function missingStripeEnv(names: string[]) { return names.filter((name) => !stripeEnv(name)); }
export function getStripeClient() {
  const secret = stripeEnv('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('STRIPE_SECRET_KEY is missing.');
  if (!cached) cached = new Stripe(secret, { typescript: true });
  return cached;
}
export function appBaseUrl() { return (stripeEnv('NEXT_PUBLIC_APP_URL') || stripeEnv('ADMIN_URL') || stripeEnv('NEXT_PUBLIC_ADMIN_URL') || 'http://localhost:3000').replace(/\/$/, ''); }
export function stripeConfiguredForPlatform(plan: 'monthly' | 'yearly') { const price = plan === 'yearly' ? 'STRIPE_PLATFORM_PRICE_YEARLY' : 'STRIPE_PLATFORM_PRICE_MONTHLY'; return missingStripeEnv(['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_APP_URL', price]); }
export function stripeConfiguredForConnect() { return missingStripeEnv(['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_CLIENT_ID', 'NEXT_PUBLIC_APP_URL']); }
