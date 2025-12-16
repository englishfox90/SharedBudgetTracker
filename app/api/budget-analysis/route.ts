import { NextResponse } from 'next/server';
import { analyzeBudget } from '@/lib/budget-advisor';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    // Validate user is authenticated and get their account
    const validation = await validateAccountAccess();
    if (validation instanceof NextResponse) return validation;

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getUTCFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getUTCMonth() + 1).toString());

    const analysis = await analyzeBudget(validation.accountId, year, month);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Budget analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze budget' },
      { status: 500 }
    );
  }
}
