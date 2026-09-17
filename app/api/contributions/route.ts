import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVariableExpenseEstimates } from '@/lib/variable-expenses-advanced';
import { validateAccountAccess } from '@/lib/auth-helpers';
import { allocateContributions, summarizeAllocation } from '@/lib/contribution-capacity';

/**
 * POST /api/contributions?accountId=X
 *
 * Recalculates each person's contribution from the forecasted expenses.
 *
 * The split is proportional to take-home pay rather than gross salary, and no
 * one is asked for more than their ceiling allows. When the forecast needs more
 * cash than the ceilings can supply, the endpoint writes what fits and returns
 * the shortfall instead of silently overloading a paycheck.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const accountIdInt = validation.accountId;

    // Get all income rules, with the payroll detail needed to estimate net pay
    const incomeRules = await prisma.incomeRule.findMany({
      where: { accountId: accountIdInt },
      include: { deductions: true },
    });

    if (incomeRules.length === 0) {
      return NextResponse.json({ error: 'No income rules found' }, { status: 400 });
    }

    // Get all recurring expenses (both fixed and variable)
    const expenses = await prisma.recurringExpense.findMany({
      where: { accountId: accountIdInt },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ error: 'No expenses found' }, { status: 400 });
    }

    // Calculate average monthly expenses over next 6 months for stability
    const now = new Date();
    const monthlyExpenseTotals: number[] = [];

    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1; // 1-indexed

      // Get variable expense estimates for this month
      const variableEstimates = await getVariableExpenseEstimates(
        accountIdInt,
        targetYear,
        targetMonth
      );

      let monthTotal = 0;

      for (const expense of expenses) {
        let monthlyAmount = 0;

        if (expense.isVariable && variableEstimates[expense.id]) {
          // Use advanced predictive estimate
          monthlyAmount = variableEstimates[expense.id];
        } else {
          // Use configured amount for fixed expenses
          monthlyAmount = expense.amount;
        }

        // Convert to monthly if needed
        const frequency = expense.frequency || 'monthly';
        switch (frequency) {
          case 'weekly':
            monthlyAmount = monthlyAmount * (52 / 12); // 4.33 weeks per month
            break;
          case 'bi_weekly':
            monthlyAmount = monthlyAmount * (26 / 12); // 2.17 times per month
            break;
          case 'semi_monthly':
            monthlyAmount = monthlyAmount * 2; // 2 times per month
            break;
          case 'monthly':
          default:
            // Already monthly
            break;
        }

        monthTotal += monthlyAmount;
      }

      monthlyExpenseTotals.push(monthTotal);
    }

    // Calculate average monthly expenses across 6 months
    const totalMonthlyExpenses = monthlyExpenseTotals.reduce((sum, val) => sum + val, 0) / 6;

    // Split the annual cash need across contributors, capped by what each
    // paycheck can actually carry.
    const allocation = allocateContributions(incomeRules, totalMonthlyExpenses * 12);

    if (allocation.totalNetAnnual <= 0) {
      return NextResponse.json(
        { error: 'Estimated take-home pay is zero, so contributions cannot be split' },
        { status: 400 }
      );
    }

    await Promise.all(
      allocation.contributors.map((contributor) =>
        prisma.incomeRule.update({
          where: { id: contributor.incomeRuleId },
          data: { contributionAmount: contributor.allocatedPerPaycheck },
        })
      )
    );

    return NextResponse.json({
      success: true,
      totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
      totalMonthlyNetIncome: Math.round((allocation.totalNetAnnual / 12) * 100) / 100,
      // Share of combined take-home pay the shared expenses consume.
      contributionPercentage:
        Math.round((allocation.cashNeedAnnual / allocation.totalNetAnnual) * 10000) / 100,
      forecastPeriod: '6-month average',
      monthlyBreakdown: monthlyExpenseTotals.map((total, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        return {
          month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          total: Math.round(total * 100) / 100,
        };
      }),
      incomeRulesUpdated: allocation.contributors.length,
      // Everything a caller needs to explain the split, or why it could not be
      // met in full.
      allocation: summarizeAllocation(allocation),
    });
  } catch (error) {
    console.error('Error calculating contributions:', error);
    return NextResponse.json(
      { error: 'Failed to calculate contributions' },
      { status: 500 }
    );
  }
}
