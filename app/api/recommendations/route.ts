import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/recommendation-engine';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Missing required parameters: year, month' },
        { status: 400 }
      );
    }

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const recommendations = await generateRecommendations(
      validation.accountId,
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
