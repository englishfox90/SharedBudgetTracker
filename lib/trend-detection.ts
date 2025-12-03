import { prisma } from '@/lib/prisma';
import { createDateUTC } from '@/lib/date-utils';

export interface ExpenseTrend {
  recurringExpenseId: number;
  expenseName: string;
  currentMonthActual: number;
  threeMonthAverage: number;
  sixMonthAverage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number; // positive = increasing, negative = decreasing
  alert: boolean; // true if trending > 15% higher than average
}

export interface TrendAnalysis {
  accountId: number;
  currentYear: number;
  currentMonth: number;
  expenses: ExpenseTrend[];
  summary: {
    totalIncreasingCategories: number;
    totalDecreasingCategories: number;
    totalAlerts: number;
    averageTrendPercentage: number;
  };
}

/**
 * Analyze spending trends for variable expenses over 3 and 6 months
 */
export async function analyzeTrends(
  accountId: number,
  year: number,
  month: number
): Promise<TrendAnalysis> {
  // Get all variable recurring expenses
  const expenses = await prisma.recurringExpense.findMany({
    where: {
      accountId,
      isVariable: true,
    },
  });

  if (expenses.length === 0) {
    return {
      accountId,
      currentYear: year,
      currentMonth: month,
      expenses: [],
      summary: {
        totalIncreasingCategories: 0,
        totalDecreasingCategories: 0,
        totalAlerts: 0,
        averageTrendPercentage: 0,
      },
    };
  }

  // Get transactions for the last 6 months
  const sixMonthsAgo = subtractMonths(year, month, 6);
  const startDate = createDateUTC(sixMonthsAgo.year, sixMonthsAgo.month, 1);
  const endOfCurrentMonth = getEndOfMonth(year, month);
  
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: {
        gte: startDate,
        lte: endOfCurrentMonth,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Filter transactions linked to variable expenses
  const expenseIds = new Set(expenses.map((e: any) => e.id));
  const relevantTransactions = transactions.filter(
    (t: any) => t.recurringExpenseId && expenseIds.has(t.recurringExpenseId)
  );

  // Analyze each expense
  const expenseTrends: ExpenseTrend[] = expenses.map((expense: any) => {
    const expenseTransactions = relevantTransactions.filter(
      (t: any) => t.recurringExpenseId === expense.id
    );

    // Calculate current month actual
    const currentMonthStart = createDateUTC(year, month, 1);
    const currentMonthEnd = endOfCurrentMonth;
    const currentMonthActual = expenseTransactions
      .filter((t: any) => {
        const txDate = new Date(t.date);
        return txDate >= currentMonthStart && txDate <= currentMonthEnd;
      })
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    // Calculate 3-month average (including current month)
    const threeMonthsAgo = subtractMonths(year, month, 2);
    const threeMonthStart = createDateUTC(threeMonthsAgo.year, threeMonthsAgo.month, 1);
    const threeMonthTransactions = expenseTransactions.filter((t: any) => {
      const txDate = new Date(t.date);
      return txDate >= threeMonthStart && txDate <= currentMonthEnd;
    });
    const threeMonthTotal = threeMonthTransactions.reduce(
      (sum: number, t: any) => sum + Math.abs(t.amount),
      0
    );
    const threeMonthAverage = threeMonthTotal / 3;

    // Calculate 6-month average
    const sixMonthTotal = expenseTransactions.reduce(
      (sum: number, t: any) => sum + Math.abs(t.amount),
      0
    );
    const sixMonthAverage = sixMonthTotal / 6;

    // Determine trend based on comparison to 6-month average
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let trendPercentage = 0;
    
    if (sixMonthAverage > 0) {
      trendPercentage = ((threeMonthAverage - sixMonthAverage) / sixMonthAverage) * 100;
      
      if (trendPercentage > 5) {
        trend = 'increasing';
      } else if (trendPercentage < -5) {
        trend = 'decreasing';
      }
    }

    // Alert if current month is significantly higher than 6-month average
    const alert = sixMonthAverage > 0 && currentMonthActual > sixMonthAverage * 1.15;

    return {
      recurringExpenseId: expense.id,
      expenseName: expense.name,
      currentMonthActual: Math.round(currentMonthActual * 100) / 100,
      threeMonthAverage: Math.round(threeMonthAverage * 100) / 100,
      sixMonthAverage: Math.round(sixMonthAverage * 100) / 100,
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
      alert,
    };
  });

  // Calculate summary
  const totalIncreasingCategories = expenseTrends.filter(e => e.trend === 'increasing').length;
  const totalDecreasingCategories = expenseTrends.filter(e => e.trend === 'decreasing').length;
  const totalAlerts = expenseTrends.filter(e => e.alert).length;
  const averageTrendPercentage = expenseTrends.length > 0
    ? expenseTrends.reduce((sum, e) => sum + e.trendPercentage, 0) / expenseTrends.length
    : 0;

  return {
    accountId,
    currentYear: year,
    currentMonth: month,
    expenses: expenseTrends,
    summary: {
      totalIncreasingCategories,
      totalDecreasingCategories,
      totalAlerts,
      averageTrendPercentage: Math.round(averageTrendPercentage * 100) / 100,
    },
  };
}

/**
 * Subtract months from a given year/month
 */
function subtractMonths(year: number, month: number, monthsToSubtract: number): { year: number; month: number } {
  let newYear = year;
  let newMonth = month;

  for (let i = 0; i < monthsToSubtract; i++) {
    if (newMonth === 1) {
      newMonth = 12;
      newYear -= 1;
    } else {
      newMonth -= 1;
    }
  }

  return { year: newYear, month: newMonth };
}

/**
 * Get the last day of a given month
 */
function getEndOfMonth(year: number, month: number): Date {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = createDateUTC(nextYear, nextMonth, 1);
  
  // Subtract one day to get last day of current month
  return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
}
