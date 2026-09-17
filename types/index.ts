import type { ContributorCapacity } from '@/lib/contribution-capacity';

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
  capacity?: ContributorCapacity;
  createdAt: Date;
  updatedAt: Date;
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
