import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        incomeRules: true,
        recurringExpenses: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, startingBalance, safeMinBalance } = body;

    if (!name || !type || startingBalance === undefined || safeMinBalance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        startingBalance: parseFloat(startingBalance),
        safeMinBalance: parseFloat(safeMinBalance),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
