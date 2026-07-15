'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, KeyRound, Store, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type ProvisioningResult = {
  tenant?: Record<string, any>;
  store?: Record<string, any>;
  product?: Record<string, any>;
  credential?: {
    created?: boolean;
    rotated?: boolean;
    apiKey?: string;
    apiSecret?: string | null;
    secretShownOnce?: boolean;
    message?: string;
    scopes?: string[];
  };
  connection?: {
    apiUrl?: string;
    resolvePath?: string;
    bootstrapPath?: string;
    productPath?: string;
    pricePath?: string;
    checkoutPath?: string;
  };
};

const pricingRows = [
  { sku: 'BC-250-350-S-STD', quantity: 250, priceMinor: 1800, stock: '350gsm silk', sides: 'single-sided', turnaround: '3 working days' },
  { sku: 'BC-250-350-S-EXP', quantity: 250, priceMinor: 2400, stock: '350gsm silk', sides: 'single-sided', turnaround: 'Next working day' },
  { sku: 'BC-250-350-D-STD', quantity: 250, priceMinor: 2100, stock: '350gsm silk', sides: 'double-sided', turnaround: '3 working days' },
  { sku: 'BC-250-350-D-EXP', quantity: 250, priceMinor: 2800, stock: '350gsm silk', sides: 'double-sided', turnaround: 'Next working day' },
  { sku: 'BC-250-450-S-STD', quantity: 250, priceMinor: 2200, stock: '450gsm silk', sides: 'single-sided', turnaround: '3 working days' },
  { sku: 'BC-250-450-S-EXP', quantity: 250, priceMinor: 2900, stock: '450gsm silk', sides: 'single-sided', turnaround: 'Next working day' },
  { sku: 'BC-250-450-D-STD', quantity: 250, priceMinor: 2500, stock: '450gsm silk', sides: 'double-sided', turnaround: '3 working days' },
  { sku: 'BC-250-450-D-EXP', quantity: 250, priceMinor: 3300, stock: '450gsm silk', sides: 'double-sided', turnaround: 'Next working day' },
  { sku: 'BC-500-350-S-STD', quantity: 500, priceMinor: 2400, stock: '350gsm silk', sides: 'single-sided', turnaround: '3 working days' },
  { sku: 'BC-500-350-S-EXP', quantity: 500, priceMinor: 3200, stock: '350gsm silk', sides: 'single-sided', turnaround: 'Next working day' },
  { sku: 'BC-500-350-D-STD', quantity: 500, priceMinor: 2800, stock: '350gsm silk', sides: 'double-sided', turnaround: '3 working days' },
  { sku: 'BC-500-350-D-EXP', quantity: 500, priceMinor: 3700, stock: '350gsm silk', sides: 'double-sided', turnaround: 'Next working day' },
  { sku: 'BC-500-450-S-STD', quantity: 500, priceMinor: 2900, stock: '450gsm silk', sides: 'single-sided', turnaround: '3 working days' },
  { sku: 'BC-500-450-S-EXP', quantity: 500, priceMinor: 3800, stock: '450gsm silk', sides: 'single-sided', turnaround: 'Next working day' },
  { sku: 'BC-500-450-D-STD', quantity: 500, priceMinor: 3300, stock: '450gsm silk', sides: 'double-sided', turnaround: '3 working days' },
  { sku: 'BC-500-450-D-EXP', quantity: 500, priceMinor: 4300, stock: '450gsm silk', sides: 'double-sided', turnaround: 'Next working day' },
].map((row) => ({
  sku: row.sku,
  quantity: row.quantity,
  priceMinor: row.priceMinor,
  currency: 'GBP',
  vatRate: 20,
  options: { stock: row.stock, sides: row.sides, turnaround: row.turnaround },
}));

function buildPayload(values: {
  tenantName: string;
  tenantSlug: string;
  storeName: string;
  storeId: string;
  storeSlug: string;
  theme: string;
  domain: string;
  productName: string;
  productSlug: string;
  rotateCredential: boolean;
}) {
  return {
    tenant: { name: values.tenantName, slug: values.tenantSlug },
    store: {
      id: values.storeId,
      name: values.storeName,
      slug: values.storeSlug,
      theme: values.theme,
      status: 'published',
      domain: values.domain,
      branding: {
        brandName: values.storeName,
        primaryColor: '#18A7D0',
        tagline: 'Design, Print, Sign & Web',
      },
      content: {
        announcement: `${values.storeName} staging storefront`,
        heroTitle: 'Professional printing, made simple',
        heroSubtitle: 'Order online for collection or delivery.',
      },
      navigation: [
        { label: 'Home', href: '/' },
        { label: 'Business Cards', href: `/products/${values.productSlug}` },
      ],
    },
    product: {
      id: values.productSlug,
      name: values.productName,
      slug: values.productSlug,
      description: 'Professionally printed business cards with silk stock, printed-side and turnaround options.',
      category: {
        id: 'business-cards',
        name: 'Business Cards',
        slug: 'business-cards',
        description: 'Professional business card printing.',
      },
      priceFromMinor: 1800,
      currency: 'GBP',
      productType: 'STANDARD',
      metadataJson: {
        buyingMode: 'cart',
        content: {
          shortDescription: `Premium business cards printed by ${values.storeName}.`,
          longDescription: 'Choose quantity, stock, printed sides and turnaround. Prices are calculated by the Print SaaS backend.',
          specifications: ['Finished size: 85 × 55 mm', 'Full-colour print', '350gsm or 450gsm silk stock'],
          designGuidelines: ['Supply artwork as a high-resolution PDF', 'Add 3 mm bleed on all sides', 'Keep important text at least 3 mm from the trim edge'],
          orderingProcess: ['Choose options', 'Upload artwork or select artwork later', 'Pay securely', 'Approve proof if required'],
        },
        media: { heroImageUrl: '/images/products/business-cards.jpg', gallery: [] },
        artwork: {
          required: false,
          allowUploadNow: true,
          allowUploadLater: true,
          acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
          maxFileSizeMb: 100,
        },
        taxSettings: { vatClass: 'standard', vatRate: 20 },
        vatRate: 20,
        optionGroups: [
          {
            id: 'quantity', key: 'quantity', label: 'Quantity', role: 'quantity', displayType: 'pill', sortOrder: 1,
            values: [{ value: '250', label: '250', default: true }, { value: '500', label: '500' }],
          },
          {
            id: 'stock', key: 'stock', label: 'Paper stock', role: 'customer-option', displayType: 'card', sortOrder: 2,
            values: [{ value: '350gsm silk', label: '350gsm Silk', default: true }, { value: '450gsm silk', label: '450gsm Silk' }],
          },
          {
            id: 'sides', key: 'sides', label: 'Printed sides', role: 'customer-option', displayType: 'pill', sortOrder: 3,
            values: [{ value: 'single-sided', label: 'Single-sided', default: true }, { value: 'double-sided', label: 'Double-sided' }],
          },
          {
            id: 'turnaround', key: 'turnaround', label: 'Turnaround', role: 'delivery-turnaround', displayType: 'card', sortOrder: 4,
            values: [{ value: '3 working days', label: '3 working days', businessDays: 3, default: true }, { value: 'Next working day', label: 'Next working day', businessDays: 1 }],
          },
        ],
        pricingMatrix: { currency: 'GBP', rows: pricingRows },
      },
    },
    rotateCredential: values.rotateCredential,
  };
}

function cleanHost(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export function StorefrontSetupPage() {
  const [tenantName, setTenantName] = useState('HOLO Print');
  const [tenantSlug, setTenantSlug] = useState('holo-print');
  const [storeName, setStoreName] = useState('HOLO Print');
  const [storeId, setStoreId] = useState('holo-print');
  const [storeSlug, setStoreSlug] = useState('holo-print');
  const [theme, setTheme] = useState('base-atlantis');
  const [domain, setDomain] = useState('holo-print-staging.vercel.app');
  const [productName, setProductName] = useState('Standard Business Cards');
  const [productSlug, setProductSlug] = useState('standard-business-cards');
  const [rotateCredential, setRotateCredential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const [copied, setCopied] = useState(false);

  const envBlock = useMemo(() => {
    if (!result?.connection || !result?.credential?.apiKey || !result?.credential?.apiSecret) return '';
    return [
      `PRINT_SAAS_API_URL=${result.connection.apiUrl || ''}`,
      `PRINT_SAAS_API_KEY=${result.credential.apiKey}`,
      `PRINT_SAAS_API_SECRET=${result.credential.apiSecret}`,
      `PRINT_SAAS_RESOLVE_PATH=${result.connection.resolvePath || '/api/v1/storefront/resolve'}`,
      `PRINT_SAAS_BOOTSTRAP_PATH=${result.connection.bootstrapPath || '/api/v1/storefront/bootstrap'}`,
      `PRINT_SAAS_PRODUCT_PATH=${result.connection.productPath || '/api/v1/storefront/products'}`,
      `PRINT_SAAS_PRICE_PATH=${result.connection.pricePath || '/api/v1/storefront/pricing/calculate'}`,
      `PRINT_SAAS_CHECKOUT_PATH=${result.connection.checkoutPath || '/api/v1/storefront/checkout/session'}`,
    ].join('\n');
  }, [result]);

  async function provision() {
    const stagingHost = cleanHost(domain);
    setError('');
    setResult(null);
    setCopied(false);
    if (!stagingHost || !stagingHost.includes('.')) {
      setError('Enter the temporary storefront hostname, for example holo-print-staging.vercel.app. Do not include a page path.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/internal/platform/storefront-provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ tenantName, tenantSlug, storeName, storeId, storeSlug, theme, domain: stagingHost, productName, productSlug, rotateCredential })),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.ok === false) throw new Error(json?.error?.message || 'Storefront setup failed.');
      setResult(json.data || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Storefront setup failed.');
    } finally {
      setLoading(false);
    }
  }

  async function copyEnvironment() {
    if (!envBlock) return;
    await navigator.clipboard.writeText(envBlock);
    setCopied(true);
  }

  return (
    <div>
      <PageHeader
        title="Storefront test setup"
        subtitle="Create one published test store, one complete product, and the two-part Storefront API credential required by the frontend."
        actions={<Button onClick={() => window.location.assign('/super-admin')}>Back to Super Admin</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200"><Store size={20} /></div>
              <div>
                <h2 className="text-lg font-semibold text-white">HOLO Print test target</h2>
                <p className="mt-1 text-sm text-textMuted">These are editable setup values. Tenant and store authority remain database-controlled and are not accepted from storefront browsers.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Tenant name"><Input value={tenantName} onChange={(event) => setTenantName(event.target.value)} /></Field>
              <Field label="Tenant slug"><Input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} /></Field>
              <Field label="Store name"><Input value={storeName} onChange={(event) => setStoreName(event.target.value)} /></Field>
              <Field label="Store ID"><Input value={storeId} onChange={(event) => setStoreId(event.target.value)} /></Field>
              <Field label="Store slug"><Input value={storeSlug} onChange={(event) => setStoreSlug(event.target.value)} /></Field>
              <Field label="Theme"><Input value={theme} onChange={(event) => setTheme(event.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Temporary storefront domain"><Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="your-frontend-preview.vercel.app" /></Field></div>
              <Field label="First product"><Input value={productName} onChange={(event) => setProductName(event.target.value)} /></Field>
              <Field label="Product slug"><Input value={productSlug} onChange={(event) => setProductSlug(event.target.value)} /></Field>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <input type="checkbox" checked={rotateCredential} onChange={(event) => setRotateCredential(event.target.checked)} className="mt-1 h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold text-white">Generate a replacement key and secret</span>
                <span className="mt-1 block text-sm text-textMuted">Leave this unticked for the first setup. Tick it only when an existing secret was lost or must be replaced.</span>
              </span>
            </label>

            {error ? <div className="mt-4 flex gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100"><TriangleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div> : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={provision} disabled={loading}>{loading ? 'Creating store and credentials…' : 'Create test store + API key and secret'}</PrimaryButton>
              <span className="text-xs text-textMuted">Only one product is provisioned: Standard Business Cards.</span>
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">What this button creates</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Store" value="Published HOLO Print staging store" />
              <Info label="Theme" value="base-atlantis" />
              <Info label="Product" value="Business Cards with 16 price rows" />
              <Info label="Flow" value="Resolve → product → price → checkout" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200"><KeyRound size={20} /></div>
              <div>
                <h2 className="text-lg font-semibold text-white">Storefront credential</h2>
                <p className="mt-1 text-sm text-textMuted">This is separate from the generic Super Admin API Keys page. The storefront requires both an API key and an API secret.</p>
              </div>
            </div>

            {!result ? <p className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-textMuted">Create the test target to display both credentials and the exact Vercel environment values.</p> : null}

            {result ? (
              <div className="mt-5 space-y-4">
                <div className="flex gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>Store <strong>{result.store?.storeId || storeId}</strong> is {result.store?.status || 'published'} and the product <strong>{result.product?.slug || productSlug}</strong> is ready for testing.</span>
                </div>

                <SecretField label="PRINT_SAAS_API_KEY" value={result.credential?.apiKey || ''} />
                <SecretField label="PRINT_SAAS_API_SECRET" value={result.credential?.apiSecret || ''} />

                {!result.credential?.apiSecret ? (
                  <div className="flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                    <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                    <span>{result.credential?.message || 'This store already has a credential and its secret cannot be shown again. Tick “Generate a replacement key and secret” and run the setup once more.'}</span>
                  </div>
                ) : null}

                {envBlock ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Copy into frontend Vercel</p>
                      <Button onClick={copyEnvironment}><Copy size={14} className="mr-2" />{copied ? 'Copied' : 'Copy all values'}</Button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/20 p-4 text-xs leading-6 text-cyan-100">{envBlock}</pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Important</p>
            <p className="mt-3 text-sm text-textMuted">Copy the secret immediately. The SaaS stores only its hash, so it cannot display the same secret later. This is why the generic API Keys screen showing one value was not suitable for this storefront connection.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs uppercase tracking-[0.2em] text-textMuted">{label}</span>{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>;
}

function SecretField({ label, value }: { label: string; value: string }) {
  async function copy() { if (value) await navigator.clipboard.writeText(value); }
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p>
      <div className="flex gap-2">
        <Input readOnly value={value || 'Not available'} />
        <Button onClick={copy} disabled={!value} aria-label={`Copy ${label}`}><Copy size={15} /></Button>
      </div>
    </div>
  );
}
