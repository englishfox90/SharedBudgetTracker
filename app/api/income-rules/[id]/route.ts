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
    const { name, annualSalary, contributionAmount, payFrequency, payDays } = body;

    // Verify income rule belongs to user's account
    const existing = await prisma.incomeRule.findUnique({
      where: { id: parseInt(id) },
      select: { accountId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income rule not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(existing.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    const incomeRule = await prisma.incomeRule.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(annualSalary !== undefined && { annualSalary: parseFloat(annualSalary) }),
        ...(contributionAmount !== undefined && {
          contributionAmount: parseFloat(contributionAmount),
        }),
        ...(payFrequency && { payFrequency }),
        ...(payDays && { payDays: JSON.stringify(payDays) }),
      },
    });

    return NextResponse.json(incomeRule);
  } catch (error) {
    console.error('Error updating income rule:', error);
    return NextResponse.json(
      { error: 'Failed to update income rule' },
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
    
    // Verify income rule belongs to user's account
    const existing = await prisma.incomeRule.findUnique({
      where: { id: parseInt(id) },
      select: { accountId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income rule not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(existing.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    await prisma.incomeRule.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete income rule' },
      { status: 500 }
    );
  }
}
