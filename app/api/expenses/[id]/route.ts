import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, amount, dayOfMonth, category, frequency, isVariable, activeFrom, activeTo } =
      body;

    // Verify expense belongs to user's account
    const existing = await prisma.recurringExpense.findUnique({
      where: { id: parseInt(id) },
      select: { accountId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(existing.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    const expense = await prisma.recurringExpense.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dayOfMonth !== undefined && { dayOfMonth: parseInt(dayOfMonth) }),
        ...(category && { category }),
        ...(frequency && { frequency }),
        ...(isVariable !== undefined && { isVariable }),
        ...(activeFrom !== undefined && {
          activeFrom: activeFrom ? new Date(activeFrom) : null,
        }),
        ...(activeTo !== undefined && {
          activeTo: activeTo ? new Date(activeTo) : null,
        }),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
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
    
    // Verify expense belongs to user's account
    const existing = await prisma.recurringExpense.findUnique({
      where: { id: parseInt(id) },
      select: { accountId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(existing.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    await prisma.recurringExpense.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
