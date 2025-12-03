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

    const incomeRules = await prisma.incomeRule.findMany({
      where: { accountId: parseInt(accountId) },
    });

    return NextResponse.json(incomeRules);
  } catch (error) {
    console.error('Error fetching income rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income rules' },
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
      annualSalary,
      contributionAmount,
      payFrequency,
      payDays,
    } = body;

    if (
      !accountId ||
      !name ||
      annualSalary === undefined ||
      !payFrequency ||
      !payDays
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const incomeRule = await prisma.incomeRule.create({
      data: {
        accountId: parseInt(accountId),
        name,
        annualSalary: parseFloat(annualSalary),
        contributionAmount: contributionAmount !== undefined ? parseFloat(contributionAmount) : 0,
        payFrequency,
        payDays: JSON.stringify(payDays),
      },
    });

    return NextResponse.json(incomeRule);
  } catch (error) {
    console.error('Error creating income rule:', error);
    return NextResponse.json(
      { error: 'Failed to create income rule' },
      { status: 500 }
    );
  }
}
