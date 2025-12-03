import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const accountIdInt = parseInt(accountId);
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({
      where: { accountId: accountIdInt },
    });

    // Get paginated transactions
    const transactions = await prisma.transaction.findMany({
      where: { accountId: accountIdInt },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    });

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, date, description, amount, category, incomeRuleId, recurringExpenseId } = body;

    if (!accountId || !date || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'accountId, date, description, and amount are required' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: parseInt(accountId),
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        category: category || null,
        source: 'manual',
        ...(incomeRuleId && { incomeRuleId: parseInt(incomeRuleId) }),
        ...(recurringExpenseId && { recurringExpenseId: parseInt(recurringExpenseId) }),
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
