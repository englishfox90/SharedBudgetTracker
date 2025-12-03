import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/recommendation-engine';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!accountId || !year || !month) {
      return NextResponse.json(
        { error: 'Missing required parameters: accountId, year, month' },
        { status: 400 }
      );
    }

    const recommendations = await generateRecommendations(
      parseInt(accountId),
      parseInt(year),
      parseInt(month)
    );

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
