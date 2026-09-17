/**
 * Payroll tax constants used by the paycheck estimator.
 *
 * These are federal figures for the 2026 tax year. They change every year, so
 * they live in one file: update TAX_YEAR and the tables below each January and
 * nothing else needs to move.
 *
 * Accuracy note: the estimator reproduces a real semi-monthly stub to within a
 * few cents using the SINGLE table, which is a good sign for SINGLE and
 * MARRIED_JOINT. The HEAD_OF_HOUSEHOLD numbers have not been checked against a
 * live stub — treat that path as an estimate until someone verifies it.
 */

export const TAX_YEAR = 2026;

export type FilingStatus = 'single' | 'married_joint' | 'head_of_household';

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married filing jointly',
  head_of_household: 'Head of household',
};

export interface TaxBracket {
  /** Annual taxable income at which this rate starts. */
  from: number;
  /** Marginal rate as a decimal (0.22 = 22%). */
  rate: number;
}

/** Annual standard deduction by filing status. */
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16_100,
  married_joint: 32_200,
  head_of_household: 24_150,
};

/** Annual federal brackets, ordered low to high. */
export const FEDERAL_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { from: 0, rate: 0.1 },
    { from: 12_400, rate: 0.12 },
    { from: 50_400, rate: 0.22 },
    { from: 105_700, rate: 0.24 },
    { from: 201_775, rate: 0.32 },
    { from: 256_225, rate: 0.35 },
    { from: 640_600, rate: 0.37 },
  ],
  married_joint: [
    { from: 0, rate: 0.1 },
    { from: 24_800, rate: 0.12 },
    { from: 100_800, rate: 0.22 },
    { from: 211_400, rate: 0.24 },
    { from: 403_550, rate: 0.32 },
    { from: 512_450, rate: 0.35 },
    { from: 768_700, rate: 0.37 },
  ],
  head_of_household: [
    { from: 0, rate: 0.1 },
    { from: 17_700, rate: 0.12 },
    { from: 67_450, rate: 0.22 },
    { from: 105_700, rate: 0.24 },
    { from: 201_750, rate: 0.32 },
    { from: 256_200, rate: 0.35 },
    { from: 640_600, rate: 0.37 },
  ],
};

/** Social Security: 6.2% up to an annual wage base that resets each year. */
export const OASDI_RATE = 0.062;
export const OASDI_WAGE_BASE = 184_500;

/** Medicare: 1.45% on everything, plus 0.9% above a threshold. */
export const MEDICARE_RATE = 0.0145;
export const ADDITIONAL_MEDICARE_RATE = 0.009;

/** Withholding threshold for the additional Medicare tax. Employers apply the
 *  single-filer threshold regardless of filing status. */
export const ADDITIONAL_MEDICARE_THRESHOLD = 200_000;

/**
 * Convenience defaults for states with a single flat rate on wages. Anything
 * not listed here (or a state with brackets) needs a rate entered by hand —
 * the value stored on the income rule always wins over this table.
 */
export const FLAT_STATE_RATES: Record<string, number> = {
  AZ: 2.5,
  CO: 4.4,
  GA: 5.19,
  ID: 5.3,
  IL: 4.95,
  IN: 3.0,
  KY: 4.0,
  MI: 4.25,
  MS: 4.4,
  NC: 4.25,
  ND: 1.95,
  PA: 3.07,
  UT: 4.45,
  /** No state income tax at all. */
  AK: 0,
  FL: 0,
  NH: 0,
  NV: 0,
  SD: 0,
  TN: 0,
  TX: 0,
  WA: 0,
  WY: 0,
};

export const PAY_PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12,
};

export function payPeriodsPerYear(payFrequency: string): number {
  return PAY_PERIODS_PER_YEAR[payFrequency] ?? 24;
}
