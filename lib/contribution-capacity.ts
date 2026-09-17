/**
 * Works out how much each person can actually contribute, and splits a
 * household bill between them without asking anyone for money they do not have.
 *
 * The rule the rest of the app relies on: a contribution is paid out of
 * take-home pay, never gross. Asking someone for 99% of their deposit is not a
 * recommendation, it is a bug, so every path that sets a contribution amount
 * goes through `allocateContributions` or `evaluateContribution` first.
 *
 * Shared benefits are the other half of the story. When one person's paycheck
 * buys family health insurance, that money is already a household contribution
 * — it just never passes through the joint account. Splitting the cash bill
 * without accounting for it charges that person twice.
 */

import { DeductionInput, PaycheckBreakdown, estimatePaycheck } from './paycheck';
import { FilingStatus, payPeriodsPerYear } from './tax-tables';

/** The slice of an income rule this module needs. */
export interface IncomeRuleLike {
  id: number;
  name: string;
  annualSalary: number;
  payFrequency: string;
  contributionAmount: number;
  filingStatus?: string | null;
  stateTaxRate?: number | null;
  additionalWithholding?: number | null;
  netPayOverride?: number | null;
  maxContributionPct?: number | null;
  deductions?: Array<{
    name: string;
    amount: number;
    treatment: string;
    isSharedBenefit: boolean;
  }>;
}

export interface ContributorCapacity {
  incomeRuleId: number;
  name: string;
  payFrequency: string;
  payPeriodsPerYear: number;
  paycheck: PaycheckBreakdown;

  netPerPaycheck: number;
  netAnnual: number;

  /** Ceiling as a share of take-home, e.g. 0.8. */
  maxContributionPct: number;
  capacityPerPaycheck: number;
  capacityAnnual: number;

  /** Household value this person's deductions already buy. */
  sharedBenefitPerPaycheck: number;
  sharedBenefitAnnual: number;

  currentPerPaycheck: number;
  currentAnnual: number;

  /** Room left between the current contribution and the ceiling. */
  headroomPerPaycheck: number;
  headroomAnnual: number;

  /** Current contribution as a share of take-home. */
  utilizationOfNet: number;

  /** True when the stored contribution already exceeds the ceiling. */
  overCapacity: boolean;
  overCapacityBy: number;

  /** True when the stored contribution exceeds take-home outright. */
  exceedsNetPay: boolean;
}

export interface ContributorAllocation extends ContributorCapacity {
  /** Cash this person is asked to move into the joint account, per paycheck. */
  allocatedPerPaycheck: number;
  allocatedAnnual: number;
  /** True when the ceiling, not the fair split, decided this number. */
  cappedByCeiling: boolean;
  /** Fair share before the ceiling was applied. */
  uncappedAnnual: number;
  changePerPaycheck: number;
}

export interface AllocationResult {
  contributors: ContributorAllocation[];
  /** Cash the joint account needs over a year. */
  cashNeedAnnual: number;
  /** Cash need plus the shared benefits paid straight out of paychecks. */
  householdCostAnnual: number;
  /** Total the allocation actually covers. */
  allocatedAnnual: number;
  /** Need the ceilings could not cover. Positive means the plan does not work. */
  shortfallAnnual: number;
  /** Combined ceiling across everyone. */
  totalCapacityAnnual: number;
  totalNetAnnual: number;
  totalSharedBenefitAnnual: number;
  feasible: boolean;
}

const DEFAULT_MAX_CONTRIBUTION_PCT = 0.8;

function toDeductionInputs(rule: IncomeRuleLike): DeductionInput[] {
  return (rule.deductions ?? []).map((d) => ({
    name: d.name,
    amount: d.amount,
    treatment: d.treatment as DeductionInput['treatment'],
    isSharedBenefit: d.isSharedBenefit,
  }));
}

/** Take-home, ceiling and headroom for one person. */
export function describeCapacity(rule: IncomeRuleLike): ContributorCapacity {
  const periods = payPeriodsPerYear(rule.payFrequency);
  const paycheck = estimatePaycheck({
    annualSalary: rule.annualSalary,
    payFrequency: rule.payFrequency,
    filingStatus: (rule.filingStatus as FilingStatus) ?? 'single',
    stateTaxRate: rule.stateTaxRate ?? 0,
    additionalWithholding: rule.additionalWithholding ?? 0,
    netPayOverride: rule.netPayOverride ?? null,
    deductions: toDeductionInputs(rule),
  });

  const maxPct = clampPct(rule.maxContributionPct ?? DEFAULT_MAX_CONTRIBUTION_PCT);
  const capacityPerPaycheck = round(paycheck.net * maxPct);
  const current = rule.contributionAmount ?? 0;

  return {
    incomeRuleId: rule.id,
    name: rule.name,
    payFrequency: rule.payFrequency,
    payPeriodsPerYear: periods,
    paycheck,

    netPerPaycheck: paycheck.net,
    netAnnual: round(paycheck.net * periods),

    maxContributionPct: maxPct,
    capacityPerPaycheck,
    capacityAnnual: round(capacityPerPaycheck * periods),

    sharedBenefitPerPaycheck: paycheck.sharedBenefitDeductions,
    sharedBenefitAnnual: round(paycheck.sharedBenefitDeductions * periods),

    currentPerPaycheck: round(current),
    currentAnnual: round(current * periods),

    headroomPerPaycheck: round(capacityPerPaycheck - current),
    headroomAnnual: round((capacityPerPaycheck - current) * periods),

    utilizationOfNet: paycheck.net > 0 ? current / paycheck.net : 0,

    overCapacity: current > capacityPerPaycheck + 0.005,
    overCapacityBy: round(Math.max(0, current - capacityPerPaycheck)),
    exceedsNetPay: current > paycheck.net + 0.005,
  };
}

export interface ContributionVerdict {
  allowed: boolean;
  capacity: ContributorCapacity;
  proposedPerPaycheck: number;
  /** Largest amount that would have been accepted. */
  maxAllowedPerPaycheck: number;
  overBy: number;
  reason?: string;
}

/**
 * Checks one proposed contribution against one paycheck. This is the guard the
 * API calls before writing a contribution amount to the database.
 */
export function evaluateContribution(
  rule: IncomeRuleLike,
  proposedPerPaycheck: number
): ContributionVerdict {
  const capacity = describeCapacity(rule);
  const proposed = round(proposedPerPaycheck);
  const max = capacity.capacityPerPaycheck;

  if (proposed < 0) {
    return {
      allowed: false,
      capacity,
      proposedPerPaycheck: proposed,
      maxAllowedPerPaycheck: max,
      overBy: 0,
      reason: 'A contribution cannot be negative.',
    };
  }

  if (proposed <= max + 0.005) {
    return {
      allowed: true,
      capacity,
      proposedPerPaycheck: proposed,
      maxAllowedPerPaycheck: max,
      overBy: 0,
    };
  }

  const overBy = round(proposed - max);
  const pctOfNet = capacity.netPerPaycheck > 0 ? (proposed / capacity.netPerPaycheck) * 100 : 0;
  const reason =
    proposed > capacity.netPerPaycheck
      ? `${money(proposed)} a paycheck is more than ${capacity.name} takes home (${money(
          capacity.netPerPaycheck
        )}).`
      : `${money(proposed)} a paycheck is ${pctOfNet.toFixed(0)}% of ${capacity.name}'s take-home ` +
        `(${money(capacity.netPerPaycheck)}), above the ${Math.round(
          capacity.maxContributionPct * 100
        )}% ceiling of ${money(max)}.`;

  return {
    allowed: false,
    capacity,
    proposedPerPaycheck: proposed,
    maxAllowedPerPaycheck: max,
    overBy,
    reason,
  };
}

/**
 * Splits an annual cash need across contributors.
 *
 * Shares are proportional to what each person could put toward the household if
 * shared benefits were free — take-home plus whatever their paycheck already
 * spends on the household. Each person's shared benefits are then credited
 * against their share, so the cash asks still add up to exactly the cash need.
 *
 * Anyone whose fair share lands above their ceiling is pinned there and the
 * remainder is pushed onto whoever still has room. When nobody does, the
 * leftover is reported as a shortfall rather than quietly loaded onto a
 * paycheck that cannot carry it.
 */
export function allocateContributions(
  rules: IncomeRuleLike[],
  cashNeedAnnual: number
): AllocationResult {
  const capacities = rules.map(describeCapacity);

  const totalSharedBenefitAnnual = round(
    capacities.reduce((sum, c) => sum + c.sharedBenefitAnnual, 0)
  );
  const totalNetAnnual = round(capacities.reduce((sum, c) => sum + c.netAnnual, 0));
  const totalCapacityAnnual = round(capacities.reduce((sum, c) => sum + c.capacityAnnual, 0));
  const householdCostAnnual = round(Math.max(0, cashNeedAnnual) + totalSharedBenefitAnnual);

  // What each person could put toward the household before shared benefits are
  // taken out of their check.
  const basis = new Map<number, number>();
  for (const c of capacities) {
    basis.set(c.incomeRuleId, Math.max(0, c.netAnnual + c.sharedBenefitAnnual));
  }
  const basisTotal = Array.from(basis.values()).reduce((sum, v) => sum + v, 0);

  const uncapped = new Map<number, number>();
  const allocated = new Map<number, number>();
  const pinned = new Set<number>();
  const cappedByCeiling = new Set<number>();

  for (const c of capacities) {
    const share = basisTotal > 0 ? (basis.get(c.incomeRuleId) as number) / basisTotal : 0;
    uncapped.set(c.incomeRuleId, householdCostAnnual * share - c.sharedBenefitAnnual);
    allocated.set(c.incomeRuleId, 0);
  }

  let needRemaining = Math.max(0, cashNeedAnnual);

  // Pin anyone the ceiling (or a zero floor) decides for, then re-split what is
  // left across the rest. Each pass pins at least one person, so it terminates.
  for (let pass = 0; pass <= capacities.length; pass++) {
    const open = capacities.filter((c) => !pinned.has(c.incomeRuleId));
    if (open.length === 0) break;

    const openBasisTotal = open.reduce((sum, c) => sum + (basis.get(c.incomeRuleId) as number), 0);

    let pinnedThisPass = false;
    for (const c of open) {
      const share = openBasisTotal > 0 ? (basis.get(c.incomeRuleId) as number) / openBasisTotal : 1 / open.length;
      // On the first pass this reproduces the credited fair share exactly; on
      // later passes it spreads whatever a pinned contributor could not take.
      const target = pass === 0 ? (uncapped.get(c.incomeRuleId) as number) : needRemaining * share;

      if (target <= 0) {
        allocated.set(c.incomeRuleId, 0);
        pinned.add(c.incomeRuleId);
        pinnedThisPass = true;
      } else if (target > c.capacityAnnual) {
        allocated.set(c.incomeRuleId, c.capacityAnnual);
        needRemaining = round(needRemaining - c.capacityAnnual);
        pinned.add(c.incomeRuleId);
        cappedByCeiling.add(c.incomeRuleId);
        pinnedThisPass = true;
      }
    }

    if (!pinnedThisPass) {
      // Everyone still open fits under their ceiling — settle them and stop.
      const settled = capacities.filter((c) => !pinned.has(c.incomeRuleId));
      const settledBasisTotal = settled.reduce(
        (sum, c) => sum + (basis.get(c.incomeRuleId) as number),
        0
      );
      for (const c of settled) {
        const share =
          settledBasisTotal > 0
            ? (basis.get(c.incomeRuleId) as number) / settledBasisTotal
            : 1 / settled.length;
        const amount = pass === 0 ? (uncapped.get(c.incomeRuleId) as number) : needRemaining * share;
        allocated.set(c.incomeRuleId, round(amount));
        pinned.add(c.incomeRuleId);
      }
      needRemaining = 0;
      break;
    }
  }

  const allocatedAnnual = round(
    Array.from(allocated.values()).reduce((sum, v) => sum + v, 0)
  );
  const shortfallAnnual = round(Math.max(0, Math.max(0, cashNeedAnnual) - allocatedAnnual));

  const contributors: ContributorAllocation[] = capacities.map((c) => {
    const annual = round(allocated.get(c.incomeRuleId) ?? 0);
    const perPaycheck = round(annual / c.payPeriodsPerYear);
    return {
      ...c,
      allocatedAnnual: annual,
      allocatedPerPaycheck: perPaycheck,
      cappedByCeiling: cappedByCeiling.has(c.incomeRuleId),
      uncappedAnnual: round(uncapped.get(c.incomeRuleId) as number),
      changePerPaycheck: round(perPaycheck - c.currentPerPaycheck),
    };
  });

  return {
    contributors,
    cashNeedAnnual: round(Math.max(0, cashNeedAnnual)),
    householdCostAnnual,
    allocatedAnnual,
    shortfallAnnual,
    totalCapacityAnnual,
    totalNetAnnual,
    totalSharedBenefitAnnual,
    feasible: shortfallAnnual <= 0.005,
  };
}

function clampPct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_CONTRIBUTION_PCT;
  return Math.min(1, value);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
