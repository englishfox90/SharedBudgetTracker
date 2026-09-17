import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAccountAccess } from '@/lib/auth-helpers';
import { describeCapacity, evaluateContribution } from '@/lib/contribution-capacity';
import {
  normalizeDeductions,
  validateDeductions,
  validatePayrollFields,
} from '@/lib/income-rule-validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId);
    if (validation instanceof NextResponse) return validation;

    const incomeRules = await prisma.incomeRule.findMany({
      where: { accountId: validation.accountId },
      include: { deductions: true },
    });

    // Take-home pay and the contribution ceiling are derived, not stored, so
    // every consumer sees the same numbers without recomputing them.
    return NextResponse.json(
      incomeRules.map((rule) => ({ ...rule, capacity: describeCapacity(rule) }))
    );
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
      filingStatus,
      stateTaxRate,
      additionalWithholding,
      netPayOverride,
      maxContributionPct,
      deductions,
    } = body;

    // Validate user has access to this account
    const validation = await validateAccountAccess(accountId?.toString());
    if (validation instanceof NextResponse) return validation;

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

    const requestedContribution =
      contributionAmount !== undefined ? parseFloat(contributionAmount) : 0;

    const draft = {
      id: 0,
      name,
      annualSalary: parseFloat(annualSalary),
      payFrequency,
      contributionAmount: requestedContribution,
      filingStatus: filingStatus ?? 'single',
      stateTaxRate: stateTaxRate !== undefined ? parseFloat(stateTaxRate) : 0,
      additionalWithholding:
        additionalWithholding !== undefined ? parseFloat(additionalWithholding) : 0,
      netPayOverride: netPayOverride != null ? parseFloat(netPayOverride) : null,
      maxContributionPct:
        maxContributionPct !== undefined ? parseFloat(maxContributionPct) : 0.8,
      deductions: normalizeDeductions(deductions ?? []),
    };

    // A contribution is paid out of take-home pay, so refuse one the paycheck
    // cannot carry rather than storing a number the forecast will trust.
    const verdict = evaluateContribution(draft, requestedContribution);
    if (!verdict.allowed) {
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

    const incomeRule = await prisma.incomeRule.create({
      data: {
        accountId: parseInt(accountId),
        name,
        annualSalary: draft.annualSalary,
        contributionAmount: requestedContribution,
        payFrequency,
        payDays: JSON.stringify(payDays),
        filingStatus: draft.filingStatus,
        stateTaxRate: draft.stateTaxRate,
        additionalWithholding: draft.additionalWithholding,
        netPayOverride: draft.netPayOverride,
        maxContributionPct: draft.maxContributionPct,
        deductions: draft.deductions.length
          ? { create: draft.deductions }
          : undefined,
      },
      include: { deductions: true },
    });

    return NextResponse.json({ ...incomeRule, capacity: describeCapacity(incomeRule) });
  } catch (error) {
    console.error('Error creating income rule:', error);
    return NextResponse.json(
      { error: 'Failed to create income rule' },
      { status: 500 }
    );
  }
}
