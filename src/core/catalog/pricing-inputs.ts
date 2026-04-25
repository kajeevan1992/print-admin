export type PricingInputSummary = {
  productId: string;
  productSlug: string;
  productName: string;
  ready: boolean;
  missingRoles: string[];
  groups: Array<{
    key: string;
    name: string;
    source?: string;
    role: string;
    basis: string;
    unit?: string;
    formulaHint?: string;
    valueCount: number;
    values: Array<{
      id: string;
      label: string;
      pricingKey?: string;
      role?: string;
      basis?: string;
      quantity?: number;
      width?: number;
      height?: number;
      setupCostMinor?: number;
      runCostMinor?: number;
      minChargeMinor?: number;
      pricingMultiplier?: number;
      productionCode?: string;
    }>;
  }>;
};

const REQUIRED_PRICING_ROLES = ['size', 'material', 'quantity'];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionGroups(product: any) {
  if (Array.isArray(product.optionGroups)) return product.optionGroups;
  if (Array.isArray(product.metadataJson?.optionGroups)) return product.metadataJson.optionGroups;
  return [];
}

function valueStableId(value: any) {
  return text(value?.id || value?.sourceId || value?.pricingKey || value?.label || '');
}

function roleForGroup(group: any) {
  return text(group?.pricingInputRole || group?.pricingKey || group?.key || group?.source || 'custom');
}

export function buildPricingInputSummary(product: any): PricingInputSummary {
  const groups = optionGroups(product);
  const roles = new Set(groups.map(roleForGroup).filter(Boolean));
  const missingRoles = REQUIRED_PRICING_ROLES.filter((role) => !roles.has(role));

  return {
    productId: text(product.id),
    productSlug: text(product.slug),
    productName: text(product.name || product.title || product.slug || product.id),
    ready: missingRoles.length === 0,
    missingRoles,
    groups: groups.map((group: any) => {
      const values = Array.isArray(group?.values) ? group.values : [];
      return {
        key: text(group?.key || group?.pricingKey || group?.source),
        name: text(group?.name || group?.label || group?.key || group?.source),
        source: text(group?.source),
        role: roleForGroup(group),
        basis: text(group?.pricingBasis || 'none'),
        unit: text(group?.pricingUnit || group?.unit),
        formulaHint: text(group?.pricingFormulaHint),
        valueCount: values.length,
        values: values.map((value: any) => ({
          id: valueStableId(value),
          label: text(value?.label || value?.name || value?.id),
          pricingKey: text(value?.pricingKey),
          role: text(value?.pricingInputRole || group?.pricingInputRole),
          basis: text(value?.pricingBasis || group?.pricingBasis),
          quantity: Number(value?.quantity) || undefined,
          width: Number(value?.width) || undefined,
          height: Number(value?.height) || undefined,
          setupCostMinor: Number(value?.setupCostMinor) || undefined,
          runCostMinor: Number(value?.runCostMinor) || undefined,
          minChargeMinor: Number(value?.minChargeMinor) || undefined,
          pricingMultiplier: Number(value?.pricingMultiplier) || undefined,
          productionCode: text(value?.productionCode),
        })),
      };
    }),
  };
}
