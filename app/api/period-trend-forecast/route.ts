import { NextResponse } from 'next/server';
import { calculatePeriodTrendForecast } from '@/lib/period-trend-forecast';
import { validateAccountAccess } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/period-trend-forecast
 * Calculate period trend forecast for a variable expense
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recurringExpenseId, periodStart, periodEnd, currentBalance, asOfDate } = body;

    if (!recurringExpenseId || !periodStart || !periodEnd || currentBalance === undefined) {
      return NextResponse.json(
        { error: 'recurringExpenseId, periodStart, periodEnd, and currentBalance are required' },
        { status: 400 }
      );
    }

    // Verify the recurring expense belongs to the user's account
    const expense = await prisma.recurringExpense.findUnique({
      where: { id: parseInt(recurringExpenseId) },
      select: { accountId: true }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(expense.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    const forecast = await calculatePeriodTrendForecast(
      parseInt(recurringExpenseId),
      new Date(periodStart),
      new Date(periodEnd),
      parseFloat(currentBalance),
      asOfDate ? new Date(asOfDate) : undefined
    );

    return NextResponse.json(forecast);
  } catch (error: any) {
    console.error('Error calculating period trend forecast:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate period trend forecast' },
      { status: 500 }
    );
  }
}
