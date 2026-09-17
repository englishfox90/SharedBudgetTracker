/**
 * Exercises the allocator on the household that exposed the problem: one earner
 * carrying every health deduction, and a contribution recommendation that had
 * grown to 99.5% of their take-home.
 *
 * Run with `npx tsx scripts/verify-contribution-capacity.ts`.
 */

import { allocateContributions, describeCapacity, evaluateContribution, IncomeRuleLike } from '../lib/contribution-capacity';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const earnerA: IncomeRuleLike = {
  id: 1,
  name: 'Earner A salary',
  annualSalary: 180_000,
  payFrequency: 'semi_monthly',
  contributionAmount: 4_324.72,
  filingStatus: 'single',
  stateTaxRate: 4.45,
  maxContributionPct: 0.8,
  deductions: [
    { name: '401K EE', amount: 150, treatment: 'pre_tax_retirement', isSharedBenefit: false },
    { name: 'Dental insurance', amount: 13, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Health savings account', amount: 325, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'HSA fee', amount: 0.62, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Medical insurance', amount: 284.5, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Other pre-tax (net)', amount: -42.88, treatment: 'pre_tax_section_125', isSharedBenefit: true },
    { name: 'Post-tax insurance and Roth', amount: 436.48, treatment: 'post_tax', isSharedBenefit: false },
  ],
};

const earnerB: IncomeRuleLike = {
  id: 2,
  name: 'Earner B salary',
  annualSalary: 52_000,
  payFrequency: 'semi_monthly',
  contributionAmount: 1_183.61,
  filingStatus: 'single',
  stateTaxRate: 4.45,
  maxContributionPct: 0.8,
  deductions: [],
};

const rules = [earnerA, earnerB];
let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  if (!condition) failures++;
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('=== Take-home and ceilings ===');
for (const rule of rules) {
  const c = describeCapacity(rule);
  console.log(
    `${c.name}: gross ${money(c.paycheck.gross)} → net ${money(c.netPerPaycheck)} a check ` +
      `(${(c.paycheck.effectiveNetRate * 100).toFixed(1)}%), ceiling ${money(c.capacityPerPaycheck)}, ` +
      `currently asked ${money(c.currentPerPaycheck)} (${(c.utilizationOfNet * 100).toFixed(1)}% of net)` +
      `${c.sharedBenefitPerPaycheck ? `, shared benefits ${money(c.sharedBenefitPerPaycheck)}` : ''}`
  );
}

console.log('\n=== The guard on the current numbers ===');
const verdictA = evaluateContribution(earnerA, earnerA.contributionAmount);
check('A over the ceiling is rejected', !verdictA.allowed, verdictA.reason ?? '');
const verdictB = evaluateContribution(earnerB, earnerB.contributionAmount);
check(
  'B under the ceiling is accepted',
  verdictB.allowed,
  `${money(earnerB.contributionAmount)} is ${(describeCapacity(earnerB).utilizationOfNet * 100).toFixed(1)}% of net`
);
const overNet = evaluateContribution(earnerB, 1_900);
check('an ask above take-home is rejected outright', !overNet.allowed, overNet.reason ?? '');
check(
  'a contribution at the ceiling is accepted',
  evaluateContribution(earnerA, describeCapacity(earnerA).capacityPerPaycheck).allowed,
  ''
);

console.log('\n=== Splitting the current shared bill ===');
const cashNeed = (4_324.72 + 1_183.61) * 24;
const result = allocateContributions(rules, cashNeed);
console.log(`Cash the joint account needs: ${money(result.cashNeedAnnual)} a year`);
console.log(`Shared benefits bought by paychecks: ${money(result.totalSharedBenefitAnnual)}`);
console.log(`True household cost: ${money(result.householdCostAnnual)}`);
console.log(`Combined ceiling: ${money(result.totalCapacityAnnual)} of ${money(result.totalNetAnnual)} take-home`);
for (const c of result.contributors) {
  console.log(
    `  ${c.name}: ${money(c.allocatedPerPaycheck)} a check ` +
      `(was ${money(c.currentPerPaycheck)}, ${c.changePerPaycheck >= 0 ? '+' : ''}${money(c.changePerPaycheck)})` +
      `${c.cappedByCeiling ? ' [pinned at ceiling]' : ''}` +
      ` — ${((c.allocatedPerPaycheck / c.netPerPaycheck) * 100).toFixed(1)}% of net`
  );
}
console.log(`Uncovered shortfall: ${money(result.shortfallAnnual)} a year (feasible: ${result.feasible})`);

check('nobody is asked for more than their ceiling', result.contributors.every((c) => c.allocatedPerPaycheck <= c.capacityPerPaycheck + 0.01), '');
check('nobody is asked for more than they take home', result.contributors.every((c) => c.allocatedPerPaycheck <= c.netPerPaycheck + 0.01), '');
check('the infeasible plan is reported, not hidden', !result.feasible && result.shortfallAnnual > 0, `${money(result.shortfallAnnual)} short`);

console.log('\n=== A bill that does fit ===');
const feasible = allocateContributions(rules, 90_000);
for (const c of feasible.contributors) {
  console.log(
    `  ${c.name}: ${money(c.allocatedPerPaycheck)} a check — ${((c.allocatedPerPaycheck / c.netPerPaycheck) * 100).toFixed(1)}% of net` +
      `${c.cappedByCeiling ? ' [pinned at ceiling]' : ''}`
  );
}
check('the cash need is covered exactly', Math.abs(feasible.allocatedAnnual - 90_000) < 1, `${money(feasible.allocatedAnnual)} allocated`);
check('it is marked feasible', feasible.feasible, '');
check('shares track take-home, not gross', feasible.contributors[0].allocatedAnnual / 90_000 < 0.79, `A covers ${((feasible.contributors[0].allocatedAnnual / 90_000) * 100).toFixed(1)}%, gross split would be 78.5%`);

console.log('\n=== Edge cases ===');
const zeroNeed = allocateContributions(rules, 0);
check('a zero need allocates nothing', zeroNeed.contributors.every((c) => c.allocatedPerPaycheck === 0), '');
const noRules = allocateContributions([], 50_000);
check('no income sources reports the whole need as short', noRules.shortfallAnnual === 50_000, '');
const soleEarner = allocateContributions([earnerA], 60_000);
check('a sole earner covers what fits', Math.abs(soleEarner.allocatedAnnual - 60_000) < 1, money(soleEarner.allocatedAnnual));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
