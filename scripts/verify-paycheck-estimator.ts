/**
 * Reconciles the paycheck estimator against a real semi-monthly stub.
 *
 * The estimator decides how much the budget is allowed to ask for, so it is
 * worth being able to prove it matches payroll rather than trusting it. Run it
 * with `npx tsx scripts/verify-paycheck-estimator.ts`; every line should land
 * within a cent. If the tax tables go stale, this is what fails first.
 */

import { estimatePaycheck } from '../lib/paycheck';

/** Totals from the stub this was reconciled against (semi-monthly, Utah, single). */
const STUB = {
  grossPerCheck: 7_500,
  preTaxDeductions: 730.24,
  ficaTaxableWages: 6_919.76,
  incomeTaxableWages: 6_769.76,
  oasdi: 429.03,
  medicare: 100.34,
  federalWithholding: 1_155.33,
  stateWithholding: 301.25,
  totalTaxes: 1_985.95,
  postTaxDeductions: 436.48,
  net: 4_347.33,
};

const estimate = estimatePaycheck({
  annualSalary: STUB.grossPerCheck * 24,
  payFrequency: 'semi_monthly',
  filingStatus: 'single',
  stateTaxRate: 4.45,
  deductions: [
    { name: '401K EE', amount: 150, treatment: 'pre_tax_retirement', isSharedBenefit: false },
    { name: 'Dental insurance', amount: 13, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Health savings account', amount: 325, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'HSA fee', amount: 0.62, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Medical insurance', amount: 284.5, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    // The stub nets an undisplayed pre-tax credit against the rest.
    { name: 'Other pre-tax (net)', amount: -42.88, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Post-tax insurance and Roth', amount: 436.48, treatment: 'post_tax', isSharedBenefit: false },
  ],
});

const checks: Array<[string, number, number]> = [
  ['Pre-tax deductions', estimate.preTaxDeductions, STUB.preTaxDeductions],
  ['FICA taxable wages', estimate.ficaTaxableWages, STUB.ficaTaxableWages],
  ['Income taxable wages', estimate.incomeTaxableWages, STUB.incomeTaxableWages],
  ['OASDI', estimate.oasdi, STUB.oasdi],
  ['Medicare', estimate.medicare, STUB.medicare],
  ['Federal withholding', estimate.federalWithholding, STUB.federalWithholding],
  ['State withholding', estimate.stateWithholding, STUB.stateWithholding],
  ['Total taxes', estimate.totalTaxes, STUB.totalTaxes],
  ['Post-tax deductions', estimate.postTaxDeductions, STUB.postTaxDeductions],
  ['Net pay', estimate.net, STUB.net],
];

const TOLERANCE = 0.01;
let failed = 0;

console.log('line                      estimated       actual        diff');
console.log('-----------------------------------------------------------');
for (const [label, estimated, actual] of checks) {
  const diff = estimated - actual;
  const ok = Math.abs(diff) <= TOLERANCE;
  if (!ok) failed++;
  console.log(
    `${ok ? ' ' : 'x'} ${label.padEnd(22)} ${estimated.toFixed(2).padStart(10)} ${actual
      .toFixed(2)
      .padStart(12)} ${diff.toFixed(2).padStart(11)}`
  );
}

console.log(
  `\nTake-home is ${(estimate.effectiveNetRate * 100).toFixed(1)}% of gross. ` +
    `$${estimate.sharedBenefitDeductions.toFixed(2)} a check buys shared benefits.`
);

// What the same salary looks like with no deductions recorded, which is the
// number the budget falls back to before anyone fills the stub in.
const withoutDeductions = estimatePaycheck({
  annualSalary: STUB.grossPerCheck * 24,
  payFrequency: 'semi_monthly',
  filingStatus: 'single',
  stateTaxRate: 4.45,
});
console.log(
  `Without deductions recorded the estimate is $${withoutDeductions.net.toFixed(2)} a check ` +
    `— $${(withoutDeductions.net - estimate.net).toFixed(2)} too generous.`
);

if (failed > 0) {
  console.error(`\n${failed} line(s) outside ${TOLERANCE.toFixed(2)} tolerance.`);
  process.exit(1);
}
console.log('\nAll lines reconcile.');
