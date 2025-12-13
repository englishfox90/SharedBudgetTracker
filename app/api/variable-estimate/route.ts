import { NextResponse } from 'next/server';
import { getVariableExpenseEstimates } from '@/lib/variable-expenses-advanced';
import { validateAccountAccess } from '@/lib/auth-helpers';

/**
 * GET /api/variable-estimate?accountId=X&expenseId=Y&year=YYYY&month=MM
 * Get the estimated amount for a specific variable expense for a target month
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const expenseId = searchParams.get('expenseId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!expenseId || !year || !month) {
      return NextResponse.json(
        { error: 'expenseId, year, and month are required' },
        { status: 400 }
      );
    }

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const expenseIdInt = parseInt(expenseId);
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    // Get all estimates for the target month
    const estimates = await getVariableExpenseEstimates(
      validation.accountId,
      yearInt,
      monthInt
    );

    const estimate = estimates[expenseIdInt];

    if (estimate === undefined) {
      return NextResponse.json(
        { error: 'No estimate available for this expense' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      expenseId: expenseIdInt,
      year: yearInt,
      month: monthInt,
      estimate: Math.round(estimate * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching variable estimate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variable estimate' },
      { status: 500 }
    );
  }
}
