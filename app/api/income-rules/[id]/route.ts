import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';
import { describeCapacity, evaluateContribution } from '@/lib/contribution-capacity';
import {
  normalizeDeductions,
  validateDeductions,
  validatePayrollFields,
} from '@/lib/income-rule-validation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      annualSalary,
      contributionAmount,
      payFrequency,
      payDays,
      filingStatus,
      stateTaxRate,
      additionalWithholding,
      netPayOverride,
      maxContributionPct,
      deductions,
    } = body;

    // Verify income rule belongs to user's account
    const existing = await prisma.incomeRule.findUnique({
      where: { id: parseInt(id) },
      include: { deductions: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income rule not found' }, { status: 404 });
    }

    const validation = await validateAccountAccess(existing.accountId.toString());
    if (validation instanceof NextResponse) return validation;

    const payrollError = validatePayrollFields(body);
    if (payrollError) {
      return NextResponse.json({ error: payrollError }, { status: 400 });
    }

    if (deductions !== undefined) {
      const deductionError = validateDeductions(deductions);
      if (deductionError) {
        return NextResponse.json({ error: deductionError }, { status: 400 });
      }
    }

    // Check the contribution against the paycheck as it will be *after* this
    // patch. A salary cut, a new deduction or a lower ceiling all shrink what
    // the paycheck can carry, so the rule has to be evaluated as a whole.
    const pending = {
      ...existing,
      ...(name !== undefined && { name }),
      ...(annualSalary !== undefined && { annualSalary: parseFloat(annualSalary) }),
      ...(payFrequency !== undefined && { payFrequency }),
      ...(filingStatus !== undefined && { filingStatus }),
      ...(stateTaxRate !== undefined && { stateTaxRate: parseFloat(stateTaxRate) }),
      ...(additionalWithholding !== undefined && {
        additionalWithholding: parseFloat(additionalWithholding),
      }),
      ...(netPayOverride !== undefined && {
        netPayOverride: netPayOverride === null ? null : parseFloat(netPayOverride),
      }),
      ...(maxContributionPct !== undefined && {
        maxContributionPct: parseFloat(maxContributionPct),
      }),
      ...(deductions !== undefined && { deductions: normalizeDeductions(deductions) }),
    };

    const requestedContribution =
      contributionAmount !== undefined
        ? parseFloat(contributionAmount)
        : existing.contributionAmount;

    const verdict = evaluateContribution(
      { ...pending, contributionAmount: requestedContribution },
      requestedContribution
    );

    // Only block when this request is the thing pushing the contribution over
    // the line. An existing rule that is already above its ceiling can still be
    // edited — otherwise the fields needed to fix it would be unreachable.
    const raisesTheProblem =
      contributionAmount !== undefined || requestedContribution > 0;
    if (!verdict.allowed && raisesTheProblem) {
      const wasAlreadyOver = !evaluateContribution(existing, existing.contributionAmount).allowed;
      const contributionUnchanged =
        contributionAmount === undefined ||
        Math.abs(requestedContribution - existing.contributionAmount) < 0.005;

      if (!(wasAlreadyOver && contributionUnchanged)) {
        return NextResponse.json(
          {
            error: verdict.reason,
            capacity: verdict.capacity,
            maxAllowedPerPaycheck: verdict.maxAllowedPerPaycheck,
            overBy: verdict.overBy,
          },
          { status: 422 }
        );
      }
    }

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
        ...(filingStatus !== undefined && { filingStatus }),
        ...(stateTaxRate !== undefined && { stateTaxRate: parseFloat(stateTaxRate) }),
        ...(additionalWithholding !== undefined && {
          additionalWithholding: parseFloat(additionalWithholding),
        }),
        ...(netPayOverride !== undefined && {
          netPayOverride: netPayOverride === null ? null : parseFloat(netPayOverride),
        }),
        ...(maxContributionPct !== undefined && {
          maxContributionPct: parseFloat(maxContributionPct),
        }),
        // The deduction list is replaced wholesale: it mirrors a pay stub, and
        // patching individual lines invites drift between the two.
        ...(deductions !== undefined && {
          deductions: {
            deleteMany: {},
            create: normalizeDeductions(deductions),
          },
        }),
      },
      include: { deductions: true },
    });

    return NextResponse.json({ ...incomeRule, capacity: describeCapacity(incomeRule) });
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
