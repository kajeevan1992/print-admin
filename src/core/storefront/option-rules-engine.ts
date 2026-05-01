import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const PRODUCT_RESOURCE = 'products' as const;

type Store = Record<string, any>;

type RuleMessage = {
  ruleId: string;
  severity: 'info' | 'recommended' | 'warning' | 'blocking' | 'auto-applied';
  text: string;
  field?: string;
};

function metadata(product: Store) {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}

function valueAt(source: Store, key: string) {
  if (key in source) return source[key];
  if (source.selections && key in source.selections) return source.selections[key];
  if (source.customFields && key in source.customFields) return source.customFields[key];
  return undefined;
}

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function conditionPass(condition: Store, source: Store) {
  const actual = valueAt(source, condition.option || condition.field || condition.key);
  const operator = condition.operator || 'equals';
  const expected = condition.value;
  if (operator === 'equals') return String(actual) === String(expected);
  if (operator === 'notEquals') return String(actual) !== String(expected);
  if (operator === 'in') return Array.isArray(expected) && expected.map(String).includes(String(actual));
  if (operator === 'notIn') return Array.isArray(expected) && !expected.map(String).includes(String(actual));
  if (operator === 'greaterThan') return asNumber(actual) > asNumber(expected);
  if (operator === 'greaterThanOrEqual') return asNumber(actual) >= asNumber(expected);
  if (operator === 'lessThan') return asNumber(actual) < asNumber(expected);
  if (operator === 'lessThanOrEqual') return asNumber(actual) <= asNumber(expected);
  if (operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
  if (operator === 'empty') return actual === undefined || actual === null || actual === '';
  return false;
}

function rulePass(rule: Store, source: Store) {
  const conditions = Array.isArray(rule.when) ? rule.when : [];
  const mode = rule.match || 'all';
  if (!conditions.length) return false;
  return mode === 'any' ? conditions.some((condition) => conditionPass(condition, source)) : conditions.every((condition) => conditionPass(condition, source));
}

function panelsForSize(widthMm: number, heightMm: number, maxRollWidthMm: number) {
  const shorter = Math.min(widthMm, heightMm);
  const longer = Math.max(widthMm, heightMm);
  if (shorter <= maxRollWidthMm) return { required: false, pieces: 1, panelWidthMm: shorter, panelLengthMm: longer };
  const pieces = Math.ceil(shorter / maxRollWidthMm);
  return { required: true, pieces, panelWidthMm: Math.ceil(shorter / pieces), panelLengthMm: longer };
}

export function evaluateOptionRules(product: Store, input: Store) {
  const meta = metadata(product);
  const rules = Array.isArray(meta.rules) ? meta.rules : [];
  const source = { ...(input || {}), selections: { ...(input.selections || {}) }, customFields: { ...(input.customFields || {}) } };
  const nextSelections = { ...(source.selections || {}) };
  const hiddenOptions = new Set<string>();
  const disabledValues: Store[] = [];
  const requiredFields: Store[] = [];
  const priceAdjustments: Store[] = [];
  const messages: RuleMessage[] = [];
  let blocked = false;

  for (const rule of rules) {
    if (!rulePass(rule, source)) continue;
    const actions = Array.isArray(rule.actions) ? rule.actions : [];
    for (const action of actions) {
      if (action.type === 'forceValue') {
        nextSelections[action.option] = action.value;
        messages.push({ ruleId: rule.id, severity: 'auto-applied', text: action.message || `${action.option} has been set to ${action.value}.`, field: action.option });
      }
      if (action.type === 'hideOption') hiddenOptions.add(action.option);
      if (action.type === 'disableValue') disabledValues.push({ option: action.option, value: action.value, reason: action.message || rule.name });
      if (action.type === 'requireField') requiredFields.push(action.field);
      if (action.type === 'addPrice') priceAdjustments.push({ ruleId: rule.id, label: action.label || rule.name, amountMinor: Number(action.amountMinor || 0) });
      if (action.type === 'message') messages.push({ ruleId: rule.id, severity: action.severity || 'info', text: action.text || rule.name, field: action.field });
      if (action.type === 'block') { blocked = true; messages.push({ ruleId: rule.id, severity: 'blocking', text: action.text || rule.name, field: action.field }); }
      if (action.type === 'suggestPanels') {
        const widthMm = asNumber(valueAt(source, action.widthField || 'widthMm'));
        const heightMm = asNumber(valueAt(source, action.heightField || 'heightMm'));
        const maxRollWidthMm = asNumber(action.maxRollWidthMm, 1200);
        const panels = panelsForSize(widthMm, heightMm, maxRollWidthMm);
        if (panels.required) {
          messages.push({ ruleId: rule.id, severity: action.severity || 'warning', text: action.message || `This size needs ${panels.pieces} joined panels. The join seam may be visible.`, field: action.widthField || 'widthMm' });
          priceAdjustments.push({ ruleId: rule.id, label: `${panels.pieces} joined panels`, amountMinor: Number(action.joinCostMinor || 0), panels });
        }
      }
    }
  }

  return {
    ok: !blocked,
    blocked,
    selections: nextSelections,
    hiddenOptions: Array.from(hiddenOptions),
    disabledValues,
    requiredFields,
    priceAdjustments,
    messages,
  };
}

export async function evaluateProductRules(request: Request, input: Store) {
  const id = String(input.productId || input.id || input.slug || '').trim();
  if (!id) throw new Error('productId, id or slug is required.');
  const product = await getInternalCatalogRecord(tenantContextFromRequest(request), PRODUCT_RESOURCE, id);
  return evaluateOptionRules(product as Store, input);
}
