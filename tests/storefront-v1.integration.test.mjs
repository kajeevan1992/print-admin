import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const config = {
  baseUrl: process.env.STOREFRONT_TEST_BASE_URL?.replace(/\/$/, ''),
  apiKeyA: process.env.STOREFRONT_TEST_API_KEY_A,
  apiSecretA: process.env.STOREFRONT_TEST_API_SECRET_A,
  storeA: process.env.STOREFRONT_TEST_STORE_A,
  hostA: process.env.STOREFRONT_TEST_HOST_A,
  productA: process.env.STOREFRONT_TEST_PRODUCT_A,
  apiKeyB: process.env.STOREFRONT_TEST_API_KEY_B,
  apiSecretB: process.env.STOREFRONT_TEST_API_SECRET_B,
  storeB: process.env.STOREFRONT_TEST_STORE_B,
  productB: process.env.STOREFRONT_TEST_PRODUCT_B,
  customSizeProduct: process.env.STOREFRONT_TEST_CUSTOM_SIZE_PRODUCT,
  mixedVatProduct: process.env.STOREFRONT_TEST_MIXED_VAT_PRODUCT,
  mixedVatOptions: process.env.STOREFRONT_TEST_MIXED_VAT_OPTIONS,
  managementKey: process.env.STOREFRONT_TEST_MANAGEMENT_KEY,
  managementSecret: process.env.STOREFRONT_TEST_MANAGEMENT_SECRET,
  tenantId: process.env.STOREFRONT_TEST_TENANT_ID,
  themeId: process.env.STOREFRONT_TEST_THEME_ID || 'base',
};

const runtimeReady = Boolean(config.baseUrl && config.apiKeyA && config.apiSecretA && config.storeA);
const isolationReady = runtimeReady && Boolean(config.apiKeyB && config.apiSecretB && config.storeB);
const managementReady = Boolean(config.baseUrl && config.managementKey && config.managementSecret && config.tenantId);

function authHeaders(key, secret, storeId, extra = {}) {
  return { 'x-api-key': key, 'x-api-secret': secret, ...(storeId ? { 'x-store-id': storeId } : {}), ...extra };
}

async function api(path, { method = 'GET', key = config.apiKeyA, secret = config.apiSecretA, storeId, body, headers = {} } = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: authHeaders(key, secret, storeId, { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const selectedOptions = [];

test('published host resolves only to its authorised store', { skip: !runtimeReady || !config.hostA }, async () => {
  const { response, payload } = await api(`/api/v1/storefront/resolve?host=${encodeURIComponent(config.hostA)}`);
  assert.equal(response.status, 200);
  assert.equal(payload.data.storeId, config.storeA);
  assert.equal(payload.data.status, 'published');
});

test('bootstrap rejects a mismatched header and query selector', { skip: !runtimeReady }, async () => {
  const { response, payload } = await api(`/api/v1/storefront/bootstrap?storeId=${encodeURIComponent(`${config.storeA}-tampered`)}`, { storeId: config.storeA });
  assert.equal(response.status, 403);
  assert.equal(payload.error.code, 'STORE_SELECTOR_MISMATCH');
});

test('Tenant A credential cannot select Tenant B store', { skip: !isolationReady }, async () => {
  const { response, payload } = await api(`/api/v1/storefront/bootstrap?storeId=${encodeURIComponent(config.storeB)}`, { storeId: config.storeB });
  assert.equal(response.status, 403);
  assert.equal(payload.error.code, 'STORE_ACCESS_FORBIDDEN');
});

test('bootstrap catalogue is tenant isolated', { skip: !isolationReady || !config.productB }, async () => {
  const { response, payload } = await api(`/api/v1/storefront/bootstrap?storeId=${encodeURIComponent(config.storeA)}`, { storeId: config.storeA });
  assert.equal(response.status, 200);
  assert.equal(payload.data.storeId, config.storeA);
  assert.equal(payload.data.products.some((product) => product.slug === config.productB), false);
});

test('same product slug resolves under the selected tenant/store', { skip: !isolationReady || !config.productA }, async () => {
  const a = await api(`/api/v1/storefront/products/${encodeURIComponent(config.productA)}`, { storeId: config.storeA });
  const b = await api(`/api/v1/storefront/products/${encodeURIComponent(config.productA)}`, { key: config.apiKeyB, secret: config.apiSecretB, storeId: config.storeB });
  assert.equal(a.response.status, 200);
  if (b.response.status === 200) assert.notEqual(a.payload.data.id, b.payload.data.id);
  else assert.equal(b.response.status, 404);
});

test('pricing ignores browser totals and returns authoritative VAT totals', { skip: !runtimeReady || !config.productA }, async () => {
  const { response, payload } = await api('/api/v1/storefront/pricing/calculate', {
    method: 'POST', storeId: config.storeA,
    body: { productSlug: config.productA, selectedOptions, quantity: 100, grossMinor: 1, vatMinor: 0, netMinor: 1 },
  });
  assert.equal(response.status, 200);
  assert.ok(payload.data.grossMinor > 1);
  assert.equal(payload.data.netMinor + payload.data.vatMinor, payload.data.grossMinor);
});

test('custom-size pricing is calculated by the SaaS', { skip: !runtimeReady || !config.customSizeProduct }, async () => {
  const { response, payload } = await api('/api/v1/storefront/pricing/calculate', {
    method: 'POST', storeId: config.storeA,
    body: { productSlug: config.customSizeProduct, selectedOptions, quantity: 1, customSize: { width: 1000, height: 500, unit: 'mm' } },
  });
  assert.equal(response.status, 200);
  assert.ok(payload.data.grossMinor > 0);
});

test('mixed VAT preserves zero-rated base and VAT-rated add-on totals', { skip: !runtimeReady || !config.mixedVatProduct || !config.mixedVatOptions }, async () => {
  const options = JSON.parse(config.mixedVatOptions);
  const { response, payload } = await api('/api/v1/storefront/pricing/calculate', {
    method: 'POST', storeId: config.storeA,
    body: { productSlug: config.mixedVatProduct, selectedOptions: options, quantity: 100 },
  });
  assert.equal(response.status, 200);
  assert.equal(payload.data.vatClass, 'mixed');
  assert.ok(payload.data.vatMinor > 0);
  assert.equal(payload.data.netMinor + payload.data.vatMinor, payload.data.grossMinor);
});

test('checkout idempotency creates one order and one payment session', { skip: !runtimeReady || !config.productA }, async () => {
  const idempotencyKey = `test-checkout-${crypto.randomUUID()}`;
  const body = {
    productSlug: config.productA, selectedOptions, quantity: 100, fulfilmentMode: 'collection',
    customer: { name: 'Storefront Test', email: 'storefront-test@example.com', phone: '07000000000' },
    artwork: { status: 'send-later' },
    successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel',
    grossMinor: 1, vatMinor: 0,
  };
  const first = await api('/api/v1/storefront/checkout/session', { method: 'POST', storeId: config.storeA, body, headers: { 'idempotency-key': idempotencyKey } });
  const second = await api('/api/v1/storefront/checkout/session', { method: 'POST', storeId: config.storeA, body, headers: { 'idempotency-key': idempotencyKey } });
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.equal(first.payload.data.orderId, second.payload.data.orderId);
  assert.equal(first.payload.data.checkoutSessionId, second.payload.data.checkoutSessionId);
  assert.notEqual(first.payload.data.price.grossMinor, 1);
});

test('automatic store creation is idempotent, draft is hidden, publish activates host', { skip: !managementReady }, async () => {
  const suffix = crypto.randomBytes(5).toString('hex');
  const storeSlug = `api-test-${suffix}`;
  const idempotencyKey = `test-store-${crypto.randomUUID()}`;
  const createBody = { tenantId: config.tenantId, storeName: `API Test ${suffix}`, storeSlug, themeId: config.themeId };
  const first = await api('/api/v1/storefront/management/stores', { method: 'POST', key: config.managementKey, secret: config.managementSecret, body: createBody, headers: { 'idempotency-key': idempotencyKey } });
  const second = await api('/api/v1/storefront/management/stores', { method: 'POST', key: config.managementKey, secret: config.managementSecret, body: createBody, headers: { 'idempotency-key': idempotencyKey } });
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 201);
  assert.equal(first.payload.data.storeId, second.payload.data.storeId);

  const hidden = await api(`/api/v1/storefront/resolve?host=${encodeURIComponent(first.payload.data.canonicalHost)}`, { key: config.managementKey, secret: config.managementSecret });
  assert.equal(hidden.response.status, 404);

  const published = await api(`/api/v1/storefront/management/stores/${encodeURIComponent(first.payload.data.storeId)}/publish`, { method: 'POST', key: config.managementKey, secret: config.managementSecret });
  assert.equal(published.response.status, 200);

  const resolved = await api(`/api/v1/storefront/resolve?host=${encodeURIComponent(first.payload.data.canonicalHost)}`, { key: config.managementKey, secret: config.managementSecret });
  assert.equal(resolved.response.status, 200);
  assert.equal(resolved.payload.data.storeId, first.payload.data.storeId);
});
