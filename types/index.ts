export interface Account {
  id: number;
  name: string;
  type: string;
  startingBalance: number;
  startDate: Date;
  safeMinBalance: number;
  defaultPayFrequency: string;
  inflationRate: number;
  autoCalculateContrib: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaycheckDeduction {
  id?: number;
  incomeRuleId?: number;
  name: string;
  amount: number;
  treatment: 'pre_tax_section_125' | 'pre_tax_retirement' | 'post_tax';
  isSharedBenefit: boolean;
}

export interface IncomeRule {
  id: number;
  accountId: number;
  name: string;
  annualSalary: number;
  contributionAmount: number;
  payFrequency: string;
  payDays: string; // JSON array
  filingStatus: string;
  stateTaxRate: number;
  additionalWithholding: number;
  netPayOverride: number | null;
  maxContributionPct: number;
  deductions?: PaycheckDeduction[];
  /** Derived take-home and ceiling; attached by the income-rules API. */
  capacity?: ContributorCapacitySummary;
  createdAt: Date;
  updatedAt: Date;
}

/** Mirrors ContributorCapacity in lib/contribution-capacity.ts. */
export interface ContributorCapacitySummary {
  incomeRuleId: number;
  name: string;
  payPeriodsPerYear: number;
  netPerPaycheck: number;
  netAnnual: number;
  maxContributionPct: number;
  capacityPerPaycheck: number;
  capacityAnnual: number;
  sharedBenefitPerPaycheck: number;
  sharedBenefitAnnual: number;
  currentPerPaycheck: number;
  currentAnnual: number;
  headroomPerPaycheck: number;
  headroomAnnual: number;
  utilizationOfNet: number;
  overCapacity: boolean;
  overCapacityBy: number;
  exceedsNetPay: boolean;
  paycheck: {
    gross: number;
    preTaxDeductions: number;
    postTaxDeductions: number;
    oasdi: number;
    medicare: number;
    federalWithholding: number;
    stateWithholding: number;
    totalTaxes: number;
    net: number;
    sharedBenefitDeductions: number;
    effectiveNetRate: number;
    isEstimate: boolean;
  };
}

export interface RecurringExpense {
  id: number;
  accountId: number;
  name: string;
  amount: number;
  dayOfMonth: number;
  category: string;
  frequency: string;
  isVariable: boolean;
  budgetGoal: number | null;
  billingCycleDay: number | null;
  anchorDate: Date | null;
  activeFrom: Date | null;
  activeTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  accountId: number;
  date: Date;
  description: string;
  amount: number;
  category: string | null;
  source: string;
  incomeRuleId: number | null;
  recurringExpenseId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashEvent {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'fixed_expense' | 'variable_expense';
  actualized?: boolean;
  transactionId?: number;
  incomeRuleId?: number;
  recurringExpenseId?: number;
  forecastedAmount?: number;
  category?: string;
}

export interface DayForecast {
  date: string;
  events: CashEvent[];
  openingBalance: number;
  netChange: number;
  closingBalance: number;
  belowSafeMin: boolean;
}

export interface ForecastResult {
  accountId: number;
  year: number;
  month: number;
  startingBalance: number;
  isStartMonth: boolean;
  safeMinBalance: number;
  days: DayForecast[];
  overallStatus: {
    minBalance: number;
    daysBelowSafeMin: number;
  };
}
