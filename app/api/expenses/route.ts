import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';
import { parseDateUTC } from '@/lib/date-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const expenses = await prisma.recurringExpense.findMany({
      where: { accountId: validation.accountId },
      orderBy: { dayOfMonth: 'asc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      name,
      amount,
      dayOfMonth,
      category,
      frequency,
      isVariable,
      activeFrom,
      activeTo,
      budgetGoal,
      anchorDate,
    } = body;

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId?.toString());
    if (validation instanceof NextResponse) return validation;

    if (
      !accountId ||
      !name ||
      amount === undefined ||
      dayOfMonth === undefined ||
      !category
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await prisma.recurringExpense.create({
      data: {
        accountId: parseInt(accountId),
        name,
        amount: parseFloat(amount),
        dayOfMonth: parseInt(dayOfMonth),
        category,
        frequency: frequency || 'monthly',
        isVariable: isVariable || false,
        activeFrom: activeFrom ? parseDateUTC(activeFrom) : null,
        activeTo: activeTo ? parseDateUTC(activeTo) : null,
        budgetGoal: budgetGoal ? parseFloat(budgetGoal) : null,
        anchorDate: anchorDate ? parseDateUTC(anchorDate) : null,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
