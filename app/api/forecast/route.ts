import { NextResponse } from 'next/server';
import { generateForecast } from '@/lib/forecast';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month are required' },
        { status: 400 }
      );
    }

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const forecast = await generateForecast(
      validation.accountId,
      parseInt(year),
      parseInt(month)
    );

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
