import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Calculate the average monthly variable expense from historical transactions
 * @param accountId - The account to analyze
 * @param recurringExpenseId - The specific recurring expense to estimate
 * @param monthsBack - Number of months to look back (default: 3)
 */
export async function calculateAverageVariableExpense(
  accountId: number,
  recurringExpenseId: number,
  monthsBack: number = 3
): Promise<number> {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, monthsBack));
  const endDate = endOfMonth(subMonths(now, 1)); // Up to last month

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      recurringExpenseId, // Filter by specific expense ID
      date: {
        gte: startDate,
        lte: endDate,
      },
      amount: {
        lt: 0, // Only withdrawals
      },
    },
  });

  if (transactions.length === 0) {
    return 0;
  }

  // Group by month and calculate average
  const monthlyTotals = new Map<string, number>();
  
  transactions.forEach((txn: any) => {
    const monthKey = `${txn.date.getFullYear()}-${txn.date.getMonth()}`;
    const current = monthlyTotals.get(monthKey) || 0;
    monthlyTotals.set(monthKey, current + Math.abs(txn.amount));
  });

  const totals = Array.from(monthlyTotals.values());
  const average = totals.reduce((sum, val) => sum + val, 0) / Math.max(totals.length, 1);

  return Math.round(average * 100) / 100; // Round to 2 decimal places
}

/**
 * Get all variable expense IDs and their averages
 */
export async function getVariableExpenseEstimates(
  accountId: number,
  monthsBack: number = 3
): Promise<Record<number, number>> {
  // Get all variable recurring expenses
  const variableExpenses = await prisma.recurringExpense.findMany({
    where: {
      accountId,
      isVariable: true,
    },
  });

  const estimates: Record<number, number> = {};

  for (const expense of variableExpenses) {
    const average = await calculateAverageVariableExpense(
      accountId,
      expense.id,
      monthsBack
    );
    estimates[expense.id] = average || expense.amount; // Fallback to configured amount
  }

  return estimates;
}
