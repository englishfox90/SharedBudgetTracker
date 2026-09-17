/**
 * Turns a gross salary into what actually lands in the bank.
 *
 * The budget only ever had gross salary to work with, which is why it could
 * recommend a contribution larger than the paycheck it came from. Everything
 * that guards against that now goes through this file.
 *
 * The estimate is built the way a payroll system builds a stub: reduce gross by
 * the pre-tax deductions, annualise what is left, run it through the brackets,
 * then divide back down to one pay period. Deductions are optional — without
 * them the result is still a real estimate, just a more generous one, because
 * medical and retirement money never shows up in the bank either.
 */

import {
  ADDITIONAL_MEDICARE_RATE,
  ADDITIONAL_MEDICARE_THRESHOLD,
  FEDERAL_BRACKETS,
  FilingStatus,
  MEDICARE_RATE,
  OASDI_RATE,
  OASDI_WAGE_BASE,
  STANDARD_DEDUCTION,
  payPeriodsPerYear,
} from './tax-tables';

/**
 * How a deduction is treated by payroll, which decides which taxes it escapes.
 *
 *  - `pre_tax_section_125` — cafeteria-plan money (medical, dental, vision,
 *    HSA, FSA). Exempt from FICA as well as income tax.
 *  - `pre_tax_retirement` — traditional 401(k)/403(b). Exempt from income tax
 *    but still subject to FICA.
 *  - `post_tax` — Roth contributions, voluntary insurance. Comes out of money
 *    that has already been taxed.
 */
export type DeductionTreatment = 'pre_tax_section_125' | 'pre_tax_retirement' | 'post_tax';

export const DEDUCTION_TREATMENT_LABELS: Record<DeductionTreatment, string> = {
  pre_tax_section_125: 'Pre-tax (medical, HSA, FSA)',
  pre_tax_retirement: 'Pre-tax retirement (401k)',
  post_tax: 'Post-tax',
};

export interface DeductionInput {
  name: string;
  /** Amount withheld per paycheck. */
  amount: number;
  treatment: DeductionTreatment;
  /**
   * True when the deduction buys something the household shares — family health
   * insurance, for example. Shared deductions are money one person is already
   * putting into the household, so the allocator credits them against that
   * person's cash contribution instead of ignoring them.
   */
  isSharedBenefit: boolean;
}

export interface PaycheckInput {
  annualSalary: number;
  payFrequency: string;
  filingStatus?: FilingStatus;
  /** State income tax as a percentage (4.45 for Utah), not a decimal. */
  stateTaxRate?: number;
  /** Extra federal withholding requested on a W-4, per paycheck. */
  additionalWithholding?: number;
  deductions?: DeductionInput[];
  /**
   * Take-home from an actual stub. When set this wins over the estimate — no
   * model beats the real number, and a W-4 can move withholding in ways the
   * brackets cannot predict.
   */
  netPayOverride?: number | null;
}

export interface PaycheckBreakdown {
  payPeriodsPerYear: number;
  gross: number;
  preTaxDeductions: number;
  postTaxDeductions: number;
  /** Wages subject to Social Security and Medicare. */
  ficaTaxableWages: number;
  /** Wages subject to federal and state income tax. */
  incomeTaxableWages: number;
  oasdi: number;
  medicare: number;
  federalWithholding: number;
  stateWithholding: number;
  totalTaxes: number;
  net: number;
  /** Per-paycheck value of deductions that buy something the household shares. */
  sharedBenefitDeductions: number;
  /** net / gross, useful for showing how far apart the two numbers really are. */
  effectiveNetRate: number;
  /** False when `netPayOverride` supplied the net figure. */
  isEstimate: boolean;
}

/** Annual federal income tax on an already-reduced taxable amount. */
export function annualFederalTax(annualTaxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  if (annualTaxableIncome <= 0) return 0;

  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const { from, rate } = brackets[i];
    if (annualTaxableIncome <= from) break;
    const to = i + 1 < brackets.length ? brackets[i + 1].from : Infinity;
    tax += (Math.min(annualTaxableIncome, to) - from) * rate;
  }
  return tax;
}

/** Social Security and Medicare for one paycheck, given annual FICA wages. */
function ficaForPaycheck(annualFicaWages: number, periods: number) {
  const oasdi = (Math.min(annualFicaWages, OASDI_WAGE_BASE) * OASDI_RATE) / periods;

  let annualMedicare = annualFicaWages * MEDICARE_RATE;
  if (annualFicaWages > ADDITIONAL_MEDICARE_THRESHOLD) {
    annualMedicare += (annualFicaWages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return { oasdi, medicare: annualMedicare / periods };
}

export function estimatePaycheck(input: PaycheckInput): PaycheckBreakdown {
  const periods = payPeriodsPerYear(input.payFrequency);
  const filingStatus: FilingStatus = input.filingStatus ?? 'single';
  const stateRate = (input.stateTaxRate ?? 0) / 100;
  const deductions = input.deductions ?? [];

  const gross = input.annualSalary / periods;

  const section125 = sumDeductions(deductions, 'pre_tax_section_125');
  const preTaxRetirement = sumDeductions(deductions, 'pre_tax_retirement');
  const postTaxDeductions = sumDeductions(deductions, 'post_tax');
  const preTaxDeductions = section125 + preTaxRetirement;

  // Section 125 money escapes FICA; retirement money does not.
  const ficaTaxableWages = Math.max(0, gross - section125);
  const incomeTaxableWages = Math.max(0, gross - preTaxDeductions);

  // Payroll rounds each withholding line to cents before totalling, so round in
  // the same order — summing first and rounding once drifts a cent off the stub.
  const fica = ficaForPaycheck(ficaTaxableWages * periods, periods);
  const oasdi = round(fica.oasdi);
  const medicare = round(fica.medicare);

  const annualTaxable = Math.max(0, incomeTaxableWages * periods - STANDARD_DEDUCTION[filingStatus]);
  const federalWithholding = round(
    annualFederalTax(annualTaxable, filingStatus) / periods + (input.additionalWithholding ?? 0)
  );

  const stateWithholding = round(incomeTaxableWages * stateRate);

  const totalTaxes = round(oasdi + medicare + federalWithholding + stateWithholding);
  const estimatedNet = Math.max(0, round(gross - preTaxDeductions - totalTaxes - postTaxDeductions));

  const hasOverride = input.netPayOverride != null && input.netPayOverride > 0;
  const net = hasOverride ? (input.netPayOverride as number) : estimatedNet;

  const sharedBenefitDeductions = deductions
    .filter((d) => d.isSharedBenefit)
    .reduce((sum, d) => sum + d.amount, 0);

  return {
    payPeriodsPerYear: periods,
    gross: round(gross),
    preTaxDeductions: round(preTaxDeductions),
    postTaxDeductions: round(postTaxDeductions),
    ficaTaxableWages: round(ficaTaxableWages),
    incomeTaxableWages: round(incomeTaxableWages),
    oasdi: round(oasdi),
    medicare: round(medicare),
    federalWithholding: round(federalWithholding),
    stateWithholding: round(stateWithholding),
    totalTaxes: round(totalTaxes),
    net: round(net),
    sharedBenefitDeductions: round(sharedBenefitDeductions),
    effectiveNetRate: gross > 0 ? net / gross : 0,
    isEstimate: !hasOverride,
  };
}

function sumDeductions(deductions: DeductionInput[], treatment: DeductionTreatment): number {
  return deductions
    .filter((d) => d.treatment === treatment)
    .reduce((sum, d) => sum + d.amount, 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
