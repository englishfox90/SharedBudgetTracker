import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVariableExpenseEstimates } from '@/lib/variable-expenses-advanced';

/**
 * POST /api/contributions?accountId=X
 * Calculate and update contribution amounts based on forecasted expenses
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const accountIdInt = parseInt(accountId);

    // Get all income rules
    const incomeRules = await prisma.incomeRule.findMany({
      where: { accountId: accountIdInt },
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

    // Calculate total monthly income
    let totalMonthlyIncome = 0;
    for (const rule of incomeRules) {
      const monthlySalary = rule.annualSalary / 12;
      totalMonthlyIncome += monthlySalary;
    }

    if (totalMonthlyIncome === 0) {
      return NextResponse.json({ error: 'Total monthly income is zero' }, { status: 400 });
    }

    // Calculate contribution percentage needed
    const contributionPercentage = totalMonthlyExpenses / totalMonthlyIncome;

    // Update each income rule's contribution amount based on their share
    for (const rule of incomeRules) {
      const monthlySalary = rule.annualSalary / 12;
      const monthlyContribution = monthlySalary * contributionPercentage;

      // Convert to per-paycheck amount
      let perPaycheckAmount = monthlyContribution;
      switch (rule.payFrequency) {
        case 'weekly':
          perPaycheckAmount = monthlyContribution / (52 / 12);
          break;
        case 'bi_weekly':
          perPaycheckAmount = monthlyContribution / (26 / 12);
          break;
        case 'semi_monthly':
          perPaycheckAmount = monthlyContribution / 2;
          break;
        case 'monthly':
        default:
          // Already monthly
          break;
      }

      const roundedAmount = Math.round(perPaycheckAmount * 100) / 100;
      
      await prisma.$executeRaw`
        UPDATE income_rules 
        SET contributionAmount = ${roundedAmount}
        WHERE id = ${rule.id}
      `;
    }

    return NextResponse.json({
      success: true,
      totalMonthlyExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
      totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
      contributionPercentage: Math.round(contributionPercentage * 10000) / 100, // Convert to percentage
      forecastPeriod: '6-month average',
      monthlyBreakdown: monthlyExpenseTotals.map((total, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        return {
          month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          total: Math.round(total * 100) / 100,
        };
      }),
      incomeRulesUpdated: incomeRules.length,
    });
  } catch (error) {
    console.error('Error calculating contributions:', error);
    return NextResponse.json(
      { error: 'Failed to calculate contributions' },
      { status: 500 }
    );
  }
}
