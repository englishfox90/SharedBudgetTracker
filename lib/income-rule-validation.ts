/**
 * Shape checks for the payroll fields on an income rule. Kept out of the route
 * files so POST and PATCH can share them — a Next route module may only export
 * its HTTP handlers.
 */

import { DeductionTreatment } from './paycheck';
import { FilingStatus } from './tax-tables';

export const FILING_STATUSES: FilingStatus[] = ['single', 'married_joint', 'head_of_household'];

export const DEDUCTION_TREATMENTS: DeductionTreatment[] = [
  'pre_tax_section_125',
  'pre_tax_retirement',
  'post_tax',
];

export interface PayrollFieldsInput {
  filingStatus?: unknown;
  stateTaxRate?: unknown;
  additionalWithholding?: unknown;
  netPayOverride?: unknown;
  maxContributionPct?: unknown;
}

/** Returns an error message, or null when the fields are usable. */
export function validatePayrollFields(body: PayrollFieldsInput): string | null {
  if (
    body.filingStatus !== undefined &&
    !FILING_STATUSES.includes(body.filingStatus as FilingStatus)
  ) {
    return 'Pick a filing status from the list.';
  }
  if (body.stateTaxRate !== undefined && body.stateTaxRate !== null) {
    const rate = Number(body.stateTaxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 20) {
      return 'Enter a state tax rate between 0% and 20%.';
    }
  }
  if (body.additionalWithholding !== undefined && body.additionalWithholding !== null) {
    const extra = Number(body.additionalWithholding);
    if (!Number.isFinite(extra) || extra < 0) {
      return 'Extra withholding cannot be negative.';
    }
  }
  if (body.netPayOverride !== undefined && body.netPayOverride !== null) {
    const net = Number(body.netPayOverride);
    if (!Number.isFinite(net) || net < 0) {
      return 'Net pay cannot be negative.';
    }
  }
  if (body.maxContributionPct !== undefined && body.maxContributionPct !== null) {
    const pct = Number(body.maxContributionPct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 1) {
      return 'The contribution ceiling has to be between 1% and 100% of take-home pay.';
    }
  }
  return null;
}

export interface DeductionPayload {
  name: string;
  amount: number;
  treatment: DeductionTreatment;
  isSharedBenefit: boolean;
}

/** Returns an error message, or null when every deduction is usable. */
export function validateDeductions(deductions: unknown): string | null {
  if (!Array.isArray(deductions)) return 'Deductions could not be read. Please try again.';
  for (const raw of deductions) {
    const deduction = raw as { name?: unknown; amount?: unknown; treatment?: unknown };
    if (typeof deduction.name !== 'string' || !deduction.name.trim()) {
      return 'Every deduction needs a name.';
    }
    if (!Number.isFinite(Number(deduction.amount))) {
      return `Deduction "${deduction.name}" needs a numeric amount.`;
    }
    if (!DEDUCTION_TREATMENTS.includes(deduction.treatment as DeductionTreatment)) {
      return `Deduction "${deduction.name}" needs a treatment of ${DEDUCTION_TREATMENTS.join(', ')}.`;
    }
  }
  return null;
}

/** Normalises a validated deduction list for storage. */
export function normalizeDeductions(deductions: unknown[]): DeductionPayload[] {
  return deductions.map((raw) => {
    const d = raw as { name: string; amount: unknown; treatment: DeductionTreatment; isSharedBenefit?: unknown };
    return {
      name: d.name.trim(),
      amount: Number(d.amount),
      treatment: d.treatment,
      isSharedBenefit: Boolean(d.isSharedBenefit),
    };
  });
}
