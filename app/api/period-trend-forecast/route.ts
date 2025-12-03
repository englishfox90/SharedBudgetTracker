import { NextResponse } from 'next/server';
import { calculatePeriodTrendForecast } from '@/lib/period-trend-forecast';

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
