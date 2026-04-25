import { calculateFinalPricing, type PricingFinalResult } from './pricing-final';

export type PricingDiagnosticSeverity = 'ok' | 'warning' | 'error';

export type PricingDiagnosticCheck = {
  key: string;
  label: string;
  severity: PricingDiagnosticSeverity;
  message: string;
  details?: Record<string, unknown>;
};

export type PricingDiagnosticsResult = {
  status: 'ready' | 'warnings' | 'blocked';
  productId: string;
  productSlug: string;
  productName: string;
  quantity: number;
  currency: string;
  finalPriceMinor: number;
  unitPriceMinor: number;
  checks: PricingDiagnosticCheck[];
  warnings: string[];
  pricing: PricingFinalResult;
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function money(value: unknown): number {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function addCheck(checks: PricingDiagnosticCheck[], check: PricingDiagnosticCheck) {
  checks.push(check);
}

function checkRequiredPricingRoles(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  const roles = new Set(pricing.calculation.quoteInput.lines.map((line) => String(line.role || line.groupKey || '').toLowerCase()));
  const required = ['quantity'];
  for (const role of required) {
    addCheck(checks, {
      key: `role-${role}`,
      label: `Pricing role: ${role}`,
      severity: roles.has(role) ? 'ok' : 'error',
      message: roles.has(role) ? `${role} role is present.` : `${role} role is missing. Add an option group/value with pricing role ${role}.`,
    });
  }

  const hasCommercialRole = ['material', 'finish', 'size', 'turnaround', 'sides', 'custom-size'].some((role) => roles.has(role));
  addCheck(checks, {
    key: 'commercial-roles',
    label: 'Commercial pricing roles',
    severity: hasCommercialRole ? 'ok' : 'warning',
    message: hasCommercialRole
      ? 'At least one commercial role is configured.'
      : 'No commercial role found yet. Add size/material/finish/turnaround roles before using this commercially.',
  });
}

function checkCostLines(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  const lines = asArray(pricing.calculation.costBreakdown.lines);
  const chargeLines = lines.filter((line) => money(line.totalMinor) > 0 && line.type !== 'minimum');
  addCheck(checks, {
    key: 'cost-lines',
    label: 'Cost lines',
    severity: chargeLines.length > 0 ? 'ok' : 'warning',
    message: chargeLines.length > 0 ? `${chargeLines.length} chargeable cost line(s) found.` : 'No chargeable cost lines found. Add setup/run costs to product options or base price.',
    details: { totalLines: lines.length, chargeLines: chargeLines.length },
  });
}

function checkProductionEstimate(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  const estimate = pricing.calculation.productionEstimate;
  const units = Number(estimate?.sourceUnitsRequired || 0);
  addCheck(checks, {
    key: 'production-estimate',
    label: 'Production estimate',
    severity: units > 0 ? 'ok' : 'warning',
    message: units > 0
      ? `Production estimate created with ${units} source unit(s).`
      : 'Production estimate could not calculate source units. Add size/source sheet/roll/board settings.',
    details: {
      productKind: estimate?.productKind,
      sourceUnitsRequired: estimate?.sourceUnitsRequired,
      impressions: estimate?.impressions,
      upsPerSource: estimate?.upsPerSource,
    },
  });
}

function checkFinalPrice(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  addCheck(checks, {
    key: 'final-price',
    label: 'Final price',
    severity: pricing.sellPriceMinor > 0 ? 'ok' : 'error',
    message: pricing.sellPriceMinor > 0
      ? `Final price is ${pricing.currency} ${(pricing.sellPriceMinor / 100).toFixed(2)}.`
      : 'Final price is zero. Add base price, setup/run costs, or minimum charge.',
    details: {
      costMinor: pricing.costMinor,
      sellPriceMinor: pricing.sellPriceMinor,
      unitPriceMinor: pricing.unitPriceMinor,
      minimumChargeMinor: pricing.minimumChargeMinor,
    },
  });
}

function checkRules(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  const adjustments = asArray(pricing.adjustments);
  addCheck(checks, {
    key: 'pricing-rules',
    label: 'Pricing rules',
    severity: adjustments.length > 0 ? 'ok' : 'warning',
    message: adjustments.length > 0 ? `${adjustments.length} pricing adjustment(s) applied.` : 'No final pricing rules applied yet. Add markup, margin, minimum, rounding, or quantity breaks when ready.',
    details: { adjustments: adjustments.map((item) => ({ key: item.key, type: item.type, amountMinor: item.amountMinor })) },
  });
}

function checkSelections(pricing: PricingFinalResult, checks: PricingDiagnosticCheck[]) {
  const unresolved = pricing.calculation.quoteInput.lines.filter((line) => line.warnings.some((warning) => warning.toLowerCase().includes('default')));
  addCheck(checks, {
    key: 'selection-defaults',
    label: 'Customer selections',
    severity: unresolved.length === 0 ? 'ok' : 'warning',
    message: unresolved.length === 0
      ? 'Selections resolved cleanly.'
      : `${unresolved.length} option group(s) used fallback/default selection. Test with real customer selections before launch.`,
    details: { fallbackGroups: unresolved.map((line) => line.groupKey) },
  });
}

export function buildPricingDiagnostics(request: { product: any; selections?: Record<string, unknown>; quantity?: number }): PricingDiagnosticsResult {
  const pricing = calculateFinalPricing(request);
  const checks: PricingDiagnosticCheck[] = [];

  checkRequiredPricingRoles(pricing, checks);
  checkSelections(pricing, checks);
  checkProductionEstimate(pricing, checks);
  checkCostLines(pricing, checks);
  checkRules(pricing, checks);
  checkFinalPrice(pricing, checks);

  for (const warning of pricing.warnings) {
    addCheck(checks, {
      key: `pricing-warning-${checks.length}`,
      label: 'Pricing warning',
      severity: warning.toLowerCase().includes('missing') || warning.toLowerCase().includes('not ready') ? 'error' : 'warning',
      message: warning,
    });
  }

  const hasError = checks.some((check) => check.severity === 'error');
  const hasWarning = checks.some((check) => check.severity === 'warning');

  return {
    status: hasError ? 'blocked' : hasWarning ? 'warnings' : 'ready',
    productId: text(pricing.calculation.productId),
    productSlug: text(pricing.calculation.productSlug),
    productName: text(pricing.calculation.productName),
    quantity: pricing.quantity,
    currency: pricing.currency,
    finalPriceMinor: pricing.sellPriceMinor,
    unitPriceMinor: pricing.unitPriceMinor,
    checks,
    warnings: pricing.warnings,
    pricing,
  };
}
