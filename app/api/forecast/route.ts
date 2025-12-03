import { NextResponse } from 'next/server';
import { generateForecast } from '@/lib/forecast';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!accountId || !year || !month) {
      return NextResponse.json(
        { error: 'accountId, year, and month are required' },
        { status: 400 }
      );
    }

    const forecast = await generateForecast(
      parseInt(accountId),
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
