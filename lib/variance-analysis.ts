import { prisma } from '@/lib/prisma';
import { createDateUTC } from '@/lib/date-utils';

export interface CategoryVariance {
  recurringExpenseId: number;
  expenseName: string;
  estimatedMonthly: number;
  actualMonthly: number;
  variance: number; // positive = over budget, negative = under budget
  variancePercentage: number;
}

export interface VarianceAnalysis {
  accountId: number;
  year: number;
  month: number;
  categories: CategoryVariance[];
  totals: {
    totalEstimated: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePercentage: number;
  };
}

/**
 * Analyze variance between estimated and actual variable expenses for a given month
 */
export async function analyzeVariance(
  accountId: number,
  year: number,
  month: number
): Promise<VarianceAnalysis> {
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
      year,
      month,
      categories: [],
      totals: {
        totalEstimated: 0,
        totalActual: 0,
        totalVariance: 0,
        totalVariancePercentage: 0,
      },
    };
  }

  // Get actual transactions for this month linked to these expenses
  const startDate = createDateUTC(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = createDateUTC(nextYear, nextMonth, 1);
  
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  // Filter transactions linked to variable expenses
  const expenseIds = new Set(expenses.map((e: any) => e.id));
  const relevantTransactions = transactions.filter(
    (t: any) => t.recurringExpenseId && expenseIds.has(t.recurringExpenseId)
  );

  // Calculate variance for each category
  const categories: CategoryVariance[] = expenses.map((expense: any) => {
    const estimatedMonthly = expense.amount;
    
    // Sum up actual transactions for this expense
    const actualMonthly = relevantTransactions
      .filter((t: any) => t.recurringExpenseId === expense.id)
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    
    const variance = actualMonthly - estimatedMonthly;
    const variancePercentage = estimatedMonthly > 0 
      ? (variance / estimatedMonthly) * 100 
      : 0;

    return {
      recurringExpenseId: expense.id,
      expenseName: expense.name,
      estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
      actualMonthly: Math.round(actualMonthly * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercentage: Math.round(variancePercentage * 100) / 100,
    };
  });

  // Calculate totals
  const totalEstimated = categories.reduce((sum, c) => sum + c.estimatedMonthly, 0);
  const totalActual = categories.reduce((sum, c) => sum + c.actualMonthly, 0);
  const totalVariance = totalActual - totalEstimated;
  const totalVariancePercentage = totalEstimated > 0 
    ? (totalVariance / totalEstimated) * 100 
    : 0;

  return {
    accountId,
    year,
    month,
    categories,
    totals: {
      totalEstimated: Math.round(totalEstimated * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalVariance: Math.round(totalVariance * 100) / 100,
      totalVariancePercentage: Math.round(totalVariancePercentage * 100) / 100,
    },
  };
}
