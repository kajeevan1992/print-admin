export type ProductConfigRole =
  | 'customer-option'
  | 'quantity'
  | 'delivery-turnaround'
  | 'hidden-auto'
  | 'pricing-only'
  | 'production-only'
  | 'info-only';

export type StorefrontOptionValue = Record<string, any> & {
  id: string;
  value: string;
  label: string;
  visible: boolean;
  disabled: boolean;
  recommended?: boolean;
  default?: boolean;
};

export type StorefrontOptionGroup = Record<string, any> & {
  id: string;
  key: string;
  label: string;
  adminLabel: string;
  role: ProductConfigRole | string;
  renderLocation: string;
  displayType: string;
  visible: boolean;
  sortOrder: number;
  options: StorefrontOptionValue[];
};

export type PricingMatrixRow = Record<string, any> & {
  quantity?: number | string | null;
  qty?: number | string | null;
  priceMinor?: number | string | null;
  supplierPriceMinor?: number | string | null;
  totalMinor?: number | string | null;
  price?: number | string | null;
  options?: Record<string, any>;
};

export type ProductConfigResolveInput = {
  selections?: Record<string, any>;
  quantity?: string | number | null;
  delivery?: string | null;
};

function asArray<T = any>(...values: any[]): T[] {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value as T[];
  }
  return [];
}

function clean(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function slugify(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normaliseRole(value: unknown) {
  return slugify(value).replace(/_/g, '-');
}

function metaOf(item: Record<string, any> = {}) {
  return item.storefrontMeta || item.metadata || item.meta || item.settings || {};
}

export function groupRole(group: Record<string, any> = {}): ProductConfigRole | string {
  const meta = metaOf(group);
  const explicit = normaliseRole(group.role || group.storefrontRole || group.configRole || group.optionRole || meta.role || meta.storefrontRole || '');
  if (explicit) return explicit;
  const key = clean(`${group.key || ''} ${group.label || ''} ${group.name || ''} ${group.title || ''}`);
  if (key.includes('quantity') || key.includes('print run') || key.includes('print-run') || key.includes('qty')) return 'quantity';
  if (key.includes('turnaround') || key.includes('delivery service') || key.includes('delivery option')) return 'delivery-turnaround';
  return 'customer-option';
}

export function renderLocation(group: Record<string, any> = {}) {
  const meta = metaOf(group);
  return normaliseRole(group.renderLocation || group.storefrontLocation || meta.renderLocation || meta.storefrontLocation || 'configurator');
}

function displayType(group: Record<string, any> = {}) {
  const meta = metaOf(group);
  return String(group.storefrontDisplayType || group.displayType || meta.displayType || group.style || group.inputType || group.type || 'pill');
}

function valueList(group: Record<string, any> = {}): StorefrontOptionValue[] {
  return asArray(group.values, group.options, group.choices, group.items, group.optionValues)
    .map((option: any, index: number) => {
      if (typeof option === 'string' || typeof option === 'number') {
        return { id: String(option), value: String(option), label: String(option), visible: true, disabled: false, recommended: index === 0, default: index === 0 };
      }
      const meta = metaOf(option || {});
      const value = option?.value ?? option?.label ?? option?.name ?? option?.key ?? option?.id ?? '';
      return {
        ...(option || {}),
        id: option?.id || option?.key || String(value),
        value: String(value),
        label: option?.label || option?.name || String(value),
        helpText: option?.helpText || option?.description || meta.helpText || meta.description || '',
        serviceCode: option?.serviceCode || meta.serviceCode || '',
        cutoffTime: option?.cutoffTime || meta.cutoffTime || '',
        cutoffMessage: option?.cutoffMessage || meta.cutoffMessage || option?.cutoff || '',
        estimatedDispatchDate: option?.estimatedDispatchDate || meta.estimatedDispatchDate || '',
        estimatedDeliveryDate: option?.estimatedDeliveryDate || meta.estimatedDeliveryDate || '',
        businessDays: option?.businessDays ?? meta.businessDays,
        businessDaysMin: option?.businessDaysMin ?? meta.businessDaysMin,
        businessDaysMax: option?.businessDaysMax ?? meta.businessDaysMax,
        recommended: Boolean(option?.recommended || option?.default || option?.isDefault || index === 0),
        default: Boolean(option?.default || option?.isDefault || index === 0),
        visible: option?.visible !== false && option?.hidden !== true && meta.visible !== false && meta.hidden !== true,
        disabled: Boolean(option?.disabled || option?.isDisabled),
      };
    })
    .filter((option) => Boolean(option.value));
}

export function normaliseOptionGroups(product: Record<string, any> = {}): StorefrontOptionGroup[] {
  const groups = asArray(product.optionGroups, product.metadataJson?.optionGroups, product.configurator?.optionGroups, product.metadataJson?.configurator?.optionGroups, product.configuration?.optionGroups, product.metadataJson?.configuration?.optionGroups, product.options, product.metadataJson?.options);
  return groups
    .map((group: any, index: number) => {
      const meta = metaOf(group || {});
      const key = group?.key || group?.id || `group-${index}`;
      const role = groupRole({ ...group, key });
      const values = valueList(group || {});
      return {
        ...(group || {}),
        id: group?.id || key,
        key,
        label: group?.customerLabel || group?.storefrontLabel || meta.customerLabel || meta.storefrontLabel || group?.label || group?.name || group?.title || key,
        adminLabel: group?.label || group?.name || group?.title || key,
        role,
        renderLocation: renderLocation(group || {}),
        displayType: displayType(group || {}),
        visible: group?.visible !== false && group?.hidden !== true && meta.visible !== false && meta.hidden !== true,
        sortOrder: Number(group?.sortOrder ?? group?.order ?? meta.sortOrder ?? index),
        options: values,
        values,
      } as StorefrontOptionGroup;
    })
    .filter((group) => group.options.length)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function pricingMatrixRows(product: Record<string, any> = {}): PricingMatrixRow[] {
  return asArray(product.pricingMatrix?.rows, product.metadataJson?.pricingMatrix?.rows, product.pricingRows, product.matrixRows, product.csvRows);
}

function rowOptions(row: PricingMatrixRow = {}) {
  return row.options || row.selections || row.config || row.configuration || row.attributes || row;
}

function readRowValue(row: PricingMatrixRow = {}, key: string) {
  const source = rowOptions(row);
  const keys = [key, key.toLowerCase(), key.toUpperCase(), key.replace(/[-_]/g, ' '), key.replace(/\s+/g, '')];
  return keys.map((candidate) => source?.[candidate]).find((value) => value !== undefined && value !== null && value !== '');
}

function rowQuantity(row: PricingMatrixRow = {}) {
  const source = rowOptions(row);
  return row.quantity || row.qty || source.quantity || source.Quantity || source.Qty || source.qty;
}

export function rowPriceMinor(row: PricingMatrixRow | null | undefined) {
  if (!row) return null;
  const minor = row.priceMinor ?? row.totalMinor ?? row.supplierPriceMinor;
  if (minor !== undefined && minor !== null && minor !== '') return Number(minor);
  const major = row.price ?? row.Price ?? row.total ?? row.Total;
  if (major !== undefined && major !== null && major !== '') {
    const parsed = Number(String(major).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
  }
  return null;
}

function positiveRow(row: PricingMatrixRow) {
  const priceMinor = rowPriceMinor(row);
  return priceMinor === null || priceMinor > 0;
}

export function rowMatchesSelections(row: PricingMatrixRow = {}, selections: Record<string, any> = {}, quantity?: string | number | null) {
  const qty = rowQuantity(row);
  if (quantity !== undefined && quantity !== null && quantity !== '' && qty && String(qty) !== String(quantity)) return false;
  return Object.entries(selections).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;
    if (groupRole({ key }) === 'quantity') return true;
    const rowValue = readRowValue(row, key);
    if (rowValue === undefined || rowValue === null || rowValue === '') return true;
    return clean(rowValue) === clean(value);
  });
}

export function buildInitialSelections(groups: StorefrontOptionGroup[]) {
  const selections: Record<string, string> = {};
  groups.forEach((group) => {
    const explicit = group.defaultValue || group.selectedValue || group.value;
    if (explicit !== undefined && explicit !== null && explicit !== '') {
      selections[group.key] = String(explicit);
      return;
    }
    const selected = group.options.find((option) => option.default || option.recommended) || group.options[0];
    if (selected) selections[group.key] = selected.value;
  });
  return selections;
}

export function isCustomerVisibleGroup(group: StorefrontOptionGroup) {
  const role = normaliseRole(group.role);
  const location = normaliseRole(group.renderLocation);
  if (['quantity', 'delivery-turnaround', 'turnaround', 'hidden-auto', 'pricing-only', 'production-only', 'info-only'].includes(role)) return false;
  if (['delivery', 'delivery-section', 'hidden', 'pricing', 'production'].includes(location)) return false;
  return group.visible !== false;
}

export function isQuantityGroup(group: StorefrontOptionGroup) {
  return normaliseRole(group.role) === 'quantity';
}

export function isDeliveryGroup(group: StorefrontOptionGroup) {
  const role = normaliseRole(group.role);
  const location = normaliseRole(group.renderLocation);
  return role === 'delivery-turnaround' || role === 'turnaround' || location === 'delivery' || location === 'delivery-section';
}

export function buildQuantityRows(product: Record<string, any>, quantityGroup: StorefrontOptionGroup | undefined, selections: Record<string, any>) {
  const rows = pricingMatrixRows(product);
  const explicitValues = quantityGroup?.options || [];
  const matrixValues = [...new Set(rows.map((row) => rowQuantity(row)).filter(Boolean))].map((value, index) => ({ id: String(value), value: String(value), label: String(value), visible: true, disabled: false, recommended: index === 0, default: index === 0 }));
  const values = explicitValues.length ? explicitValues : matrixValues;
  const safeValues = values.length ? values : [100, 250, 500, 1000, 2500, 5000].map((value, index) => ({ id: String(value), value: String(value), label: String(value), visible: true, disabled: false, recommended: index === 0, default: index === 0 }));
  const mapped = safeValues.map((option, index) => {
    const qty = option.value || option.label;
    const matched = rows.find((row) => rowMatchesSelections(row, selections, qty));
    const priceMinor = rowPriceMinor(matched) ?? Number((option as any).priceMinor || (option as any).totalMinor || 0);
    return { ...option, qty, quantity: qty, priceMinor, price: priceMinor / 100, available: !rows.length || priceMinor > 0, recommended: Boolean(option.recommended || option.default || index === 0), matchedRow: matched || null };
  });
  const available = mapped.filter((item) => item.available);
  return available.length ? available : mapped;
}

function deliveryDescription(option: StorefrontOptionValue) {
  if ((option as any).cutoffMessage) return (option as any).cutoffMessage;
  if ((option as any).estimatedDeliveryDate) return `Estimated delivery ${(option as any).estimatedDeliveryDate}`;
  if ((option as any).description) return (option as any).description;
  if ((option as any).businessDaysMin && (option as any).businessDaysMax) return `${(option as any).businessDaysMin}-${(option as any).businessDaysMax} working days`;
  if ((option as any).businessDays) return `${(option as any).businessDays} working day${Number((option as any).businessDays) === 1 ? '' : 's'}`;
  return 'Calculated by backend delivery rules';
}

export function buildDeliveryRows(product: Record<string, any>, deliveryGroup: StorefrontOptionGroup | undefined, selections: Record<string, any>, quantity?: string | number | null) {
  if (!deliveryGroup) {
    const explicit = asArray(product.deliveryOptions, product.delivery?.services, product.turnaroundOptions, product.metadataJson?.deliveryOptions, product.metadataJson?.delivery?.services);
    if (explicit.length) return explicit.map((item: any, index: number) => ({ ...item, id: item.id || item.value || item.day || item.label || item.name || `delivery-${index}`, value: item.value || item.day || item.label || item.name || `delivery-${index}`, label: item.label || item.day || item.name || `Delivery ${index + 1}`, description: item.latest || item.description || item.cutoffMessage || 'Calculated by backend delivery rules', available: item.available !== false && item.disabled !== true }));
    return [{ id: 'standard', value: 'standard', label: 'Standard delivery', description: 'Calculated by backend delivery rules', available: true }];
  }
  const rows = pricingMatrixRows(product);
  const matrixKnowsDelivery = rows.some((row) => readRowValue(row, deliveryGroup.key) !== undefined);
  const mapped = deliveryGroup.options.filter((option) => option.visible !== false).map((option, index) => {
    const deliverySelections = { ...selections, [deliveryGroup.key]: option.value };
    const candidates = rows.filter((row) => rowMatchesSelections(row, deliverySelections, quantity));
    const available = !matrixKnowsDelivery || !rows.length || candidates.some(positiveRow);
    const matchedRow = candidates.find((row) => Number(rowPriceMinor(row) || 0) > 0) || candidates[0] || null;
    return { ...option, label: option.label || option.value, description: deliveryDescription(option), priceMinor: rowPriceMinor(matchedRow), available: available && option.disabled !== true, selected: option.default || option.recommended || index === 0, matchedRow };
  });
  const available = mapped.filter((item) => item.available);
  return available.length ? available : mapped;
}

export function resolveProductConfig(product: Record<string, any> = {}, input: ProductConfigResolveInput = {}) {
  const groups = normaliseOptionGroups(product);
  const baseSelections = { ...buildInitialSelections(groups), ...(input.selections || {}) };
  const quantityGroup = groups.find(isQuantityGroup);
  const deliveryGroup = groups.find(isDeliveryGroup);
  const customerGroups = groups.filter(isCustomerVisibleGroup);
  const hiddenGroups = groups.filter((group) => !isCustomerVisibleGroup(group) && !isQuantityGroup(group) && !isDeliveryGroup(group));
  const quantityRows = buildQuantityRows(product, quantityGroup, baseSelections);
  const selectedQuantity = input.quantity || baseSelections[quantityGroup?.key || 'quantity'] || quantityRows[0]?.quantity || quantityRows[0]?.qty || null;
  const deliveryRows = buildDeliveryRows(product, deliveryGroup, baseSelections, selectedQuantity);
  const selectedDelivery = input.delivery || baseSelections[deliveryGroup?.key || 'turnaround'] || deliveryRows.find((row) => row.selected)?.value || deliveryRows[0]?.value || null;
  const selections = { ...baseSelections };
  if (quantityGroup && selectedQuantity) selections[quantityGroup.key] = String(selectedQuantity);
  if (deliveryGroup && selectedDelivery) selections[deliveryGroup.key] = String(selectedDelivery);
  const validRows = pricingMatrixRows(product).filter((row) => rowMatchesSelections(row, selections, selectedQuantity));
  const matchedRow = validRows.find((row) => Number(rowPriceMinor(row) || 0) > 0) || validRows[0] || null;
  return { groups, customerGroups, hiddenGroups, quantityGroup, deliveryGroup, quantityRows, deliveryRows, selections, selectedQuantity, selectedDelivery, matchedRow, priceMinor: rowPriceMinor(matchedRow), pricingMatrixRowCount: pricingMatrixRows(product).length, capabilities: { roles: true, deliveryMapping: true, matrixAvailability: true, hiddenPricingSelections: true, backendControlledLabels: true } };
}

export function applyProductConfigDefaults(product: Record<string, any> = {}) {
  const resolved = resolveProductConfig(product);
  return { ...product, optionGroups: resolved.groups, pricingMatrix: product.pricingMatrix || product.metadataJson?.pricingMatrix || null, deliveryOptions: resolved.deliveryRows, resolvedConfig: resolved, storefrontConfig: { groups: resolved.groups, customerGroups: resolved.customerGroups, hiddenGroups: resolved.hiddenGroups, quantityGroup: resolved.quantityGroup, deliveryGroup: resolved.deliveryGroup, capabilities: resolved.capabilities } };
}
