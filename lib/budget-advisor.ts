/**
 * Budget Advisory Engine
 * Analyzes spending vs budget goals and provides actionable insights
 */

import { prisma } from './prisma';
import { createDateUTC } from './date-utils';

export interface BudgetAnalysis {
  expense: {
    id: number;
    name: string;
    budgetGoal: number;
    isVariable: boolean;
    billingCycleDay?: number | null;
  };
  currentMonth: {
    year: number;
    month: number;
    actualSpending: number;
    budgetGoal: number;
    variance: number;
    variancePercent: number;
    daysElapsed: number;
    daysInMonth: number;
    projectedTotal: number;
    projectedVariance: number;
    status: 'on-track' | 'warning' | 'over-budget';
  };
  historical: {
    last3Months: MonthlySpending[];
    averageMonthly: number;
    trend: 'improving' | 'stable' | 'worsening';
  };
  impact: {
    annualSavingsIfGoalMet: number;
    monthlyDifference: number;
    percentageReduction: number;
  };
  recommendations: string[];
}

interface MonthlySpending {
  year: number;
  month: number;
  amount: number;
  budgetGoal: number;
  variance: number;
}

export async function analyzeBudget(
  accountId: number,
  year: number,
  month: number
): Promise<BudgetAnalysis[]> {
  // Get all variable expenses with budget goals
  const expenses = await prisma.recurringExpense.findMany({
    where: {
      accountId,
      isVariable: true,
      budgetGoal: { not: null },
    },
    include: {
      transactions: {
        where: {
          date: {
            gte: createDateUTC(year - 1, 1, 1), // Last year of data
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  const analyses: BudgetAnalysis[] = [];

  for (const expense of expenses) {
    if (!expense.budgetGoal) continue;

    const analysis = await analyzeExpenseBudget(expense, year, month);
    analyses.push(analysis);
  }

  return analyses;
}

async function analyzeExpenseBudget(
  expense: any,
  targetYear: number,
  targetMonth: number
): Promise<BudgetAnalysis> {
  const budgetGoal = expense.budgetGoal!;

  // Calculate billing period (use billing cycle if set, otherwise calendar month)
  let currentMonthStart: Date;
  let currentMonthEnd: Date;
  
  if (expense.billingCycleDay) {
    // For credit cards with billing cycles (e.g., 16th to 16th)
    // For "December", analyze from Nov 16 to Dec 15
    const cycleDay = expense.billingCycleDay;
    currentMonthStart = createDateUTC(
      targetMonth === 1 ? targetYear - 1 : targetYear,
      targetMonth === 1 ? 12 : targetMonth - 1,
      cycleDay
    );
    currentMonthEnd = createDateUTC(targetYear, targetMonth, cycleDay);
  } else {
    // Standard calendar month
    currentMonthStart = createDateUTC(targetYear, targetMonth, 1);
    currentMonthEnd = createDateUTC(
      targetMonth === 12 ? targetYear + 1 : targetYear,
      targetMonth === 12 ? 1 : targetMonth + 1,
      1
    );
  }

  const currentMonthTransactions = expense.transactions.filter(
    (t: any) => t.date >= currentMonthStart && t.date < currentMonthEnd
  );

  const actualSpending = currentMonthTransactions.reduce(
    (sum: number, t: any) => sum + Math.abs(t.amount),
    0
  );

  // Calculate days elapsed in billing period
  const now = new Date();
  const isCurrentPeriod = now >= currentMonthStart && now < currentMonthEnd;
  const daysInPeriod = Math.ceil((currentMonthEnd.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = isCurrentPeriod 
    ? Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24))
    : daysInPeriod;
  const daysInMonth = daysInPeriod;

  // Project total spending for the month
  const dailyRate = daysElapsed > 0 ? actualSpending / daysElapsed : 0;
  const projectedTotal = dailyRate * daysInMonth;

  // Calculate variance
  const variance = actualSpending - budgetGoal;
  const variancePercent = budgetGoal > 0 ? (variance / budgetGoal) * 100 : 0;
  const projectedVariance = projectedTotal - budgetGoal;

  // Determine status
  let status: 'on-track' | 'warning' | 'over-budget';
  if (actualSpending > budgetGoal) {
    status = 'over-budget';
  } else if (projectedTotal > budgetGoal * 1.1) {
    status = 'warning';
  } else {
    status = 'on-track';
  }

  // Analyze last 3 periods (billing cycles or months)
  const last3Months: MonthlySpending[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = targetMonth - i;
    let y = targetYear;
    if (m <= 0) {
      m += 12;
      y--;
    }

    let monthStart: Date;
    let monthEnd: Date;
    
    if (expense.billingCycleDay) {
      const cycleDay = expense.billingCycleDay;
      monthStart = createDateUTC(
        m === 1 ? y - 1 : y,
        m === 1 ? 12 : m - 1,
        cycleDay
      );
      monthEnd = createDateUTC(y, m, cycleDay);
    } else {
      monthStart = createDateUTC(y, m, 1);
      monthEnd = createDateUTC(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1);
    }

    const monthTransactions = expense.transactions.filter(
      (t: any) => t.date >= monthStart && t.date < monthEnd
    );

    const monthAmount = monthTransactions.reduce(
      (sum: number, t: any) => sum + Math.abs(t.amount),
      0
    );

    last3Months.unshift({
      year: y,
      month: m,
      amount: monthAmount,
      budgetGoal,
      variance: monthAmount - budgetGoal,
    });
  }

  const averageMonthly =
    last3Months.length > 0
      ? last3Months.reduce((sum, m) => sum + m.amount, 0) / last3Months.length
      : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (last3Months.length === 3) {
    const oldestVariance = last3Months[0].variance;
    const newestVariance = last3Months[2].variance;
    const change = newestVariance - oldestVariance;

    if (change < -budgetGoal * 0.1) {
      trend = 'improving';
    } else if (change > budgetGoal * 0.1) {
      trend = 'worsening';
    }
  }

  // Calculate impact
  const annualSavingsIfGoalMet = (averageMonthly - budgetGoal) * 12;
  const monthlyDifference = averageMonthly - budgetGoal;
  const percentageReduction =
    averageMonthly > 0 ? ((averageMonthly - budgetGoal) / averageMonthly) * 100 : 0;

  // Generate recommendations
  const recommendations = generateRecommendations({
    status,
    trend,
    variance,
    projectedVariance,
    averageMonthly,
    budgetGoal,
    daysElapsed,
    daysInMonth,
  });

  return {
    expense: {
      id: expense.id,
      name: expense.name,
      budgetGoal,
      isVariable: expense.isVariable,
      billingCycleDay: expense.billingCycleDay,
    },
    currentMonth: {
      year: targetYear,
      month: targetMonth,
      actualSpending,
      budgetGoal,
      variance,
      variancePercent,
      daysElapsed,
      daysInMonth,
      projectedTotal,
      projectedVariance,
      status,
    },
    historical: {
      last3Months,
      averageMonthly,
      trend,
    },
    impact: {
      annualSavingsIfGoalMet,
      monthlyDifference,
      percentageReduction,
    },
    recommendations,
  };
}

function generateRecommendations(params: {
  status: string;
  trend: string;
  variance: number;
  projectedVariance: number;
  averageMonthly: number;
  budgetGoal: number;
  daysElapsed: number;
  daysInMonth: number;
}): string[] {
  const recommendations: string[] = [];
  const {
    status,
    trend,
    variance,
    projectedVariance,
    averageMonthly,
    budgetGoal,
    daysElapsed,
    daysInMonth,
  } = params;

  // Current month status
  if (status === 'over-budget') {
    recommendations.push(
      `Already $${Math.abs(variance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} over budget with ${daysInMonth - daysElapsed} days remaining`
    );
    const targetDaily = (budgetGoal - Math.abs(variance)) / (daysInMonth - daysElapsed);
    if (targetDaily > 0) {
      recommendations.push(
        `Reduce daily spending to $${targetDaily.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} or less to get back on track`
      );
    } else {
      recommendations.push(
        `Already significantly over budget - focus on minimizing additional spending this month`
      );
    }
  } else if (status === 'warning') {
    recommendations.push(
      `Projected to exceed budget by $${Math.abs(projectedVariance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} if current pace continues`
    );
    recommendations.push(
      `Target daily spending of $${(budgetGoal / daysInMonth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to stay within budget`
    );
  } else {
    recommendations.push(
      `On track! Keep daily spending below $${(budgetGoal / daysInMonth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to maintain progress`
    );
  }

  // Trend analysis
  if (trend === 'worsening') {
    recommendations.push(
      `Spending has increased over the last 3 months - consider reviewing recent purchases`
    );
  } else if (trend === 'improving') {
    recommendations.push(`Great progress! Spending is decreasing month over month`);
  }

  // Long-term impact
  if (averageMonthly > budgetGoal) {
    const annualSavings = (averageMonthly - budgetGoal) * 12;
    recommendations.push(
      `Meeting your budget goal would save $${annualSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} annually`
    );
  }

  return recommendations;
}
