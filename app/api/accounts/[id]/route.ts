import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate user has access to this account
    const validation = await validateAccountAccess(id);
    if (validation instanceof NextResponse) return validation;
    const account = await prisma.account.findUnique({
      where: { id: parseInt(id) },
      include: {
        incomeRules: true,
        recurringExpenses: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, startingBalance, safeMinBalance, inflationRate, autoCalculateContrib, defaultPayFrequency } = body;

    // Validate user has access to this account
    const validation = await validateAccountAccess(id);
    if (validation instanceof NextResponse) return validation;

    const account = await prisma.account.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(startingBalance !== undefined && { startingBalance: parseFloat(startingBalance) }),
        ...(safeMinBalance !== undefined && { safeMinBalance: parseFloat(safeMinBalance) }),
        ...(inflationRate !== undefined && { inflationRate: parseFloat(inflationRate) }),
        ...(autoCalculateContrib !== undefined && { autoCalculateContrib }),
        ...(defaultPayFrequency && { defaultPayFrequency }),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate user has access to this account
    const validation = await validateAccountAccess(id);
    if (validation instanceof NextResponse) return validation;

    await prisma.account.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
