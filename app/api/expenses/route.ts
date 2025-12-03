import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const expenses = await prisma.recurringExpense.findMany({
      where: { accountId: parseInt(accountId) },
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
      isVariable,
      activeFrom,
      activeTo,
    } = body;

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
        isVariable: isVariable || false,
        activeFrom: activeFrom ? new Date(activeFrom) : null,
        activeTo: activeTo ? new Date(activeTo) : null,
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
