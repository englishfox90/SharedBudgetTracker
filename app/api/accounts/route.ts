import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function GET() {
  try {
    // Validate user is authenticated and get their account
    const validation = await validateAccountAccess();
    if (validation instanceof NextResponse) return validation;

    const account = await prisma.account.findUnique({
      where: { id: validation.accountId },
      include: {
        incomeRules: true,
        recurringExpenses: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Return as array for backwards compatibility with frontend
    return NextResponse.json([account]);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
