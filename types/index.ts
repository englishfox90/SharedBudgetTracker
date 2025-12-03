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

export interface IncomeRule {
  id: number;
  accountId: number;
  name: string;
  annualSalary: number;
  contributionAmount: number;
  payFrequency: string;
  payDays: string; // JSON array
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
