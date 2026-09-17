import { prisma } from '@/lib/prisma';
import { generateSixMonthForecast, SixMonthForecast } from '@/lib/six-month-forecast';
import { analyzeTrends, TrendAnalysis } from '@/lib/trend-detection';
import { ContributorCapacity, describeCapacity } from '@/lib/contribution-capacity';

export interface Suggestion {
  type: 'contribution' | 'expense' | 'balance' | 'trend';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionable: boolean;
  recommendedAction?: string;
}

export interface RecommendationOverview {
  accountId: number;
  year: number;
  month: number;
  sixMonthForecast: SixMonthForecast;
  trendAnalysis: TrendAnalysis;
  suggestions: Suggestion[];
  contributionAnalysis: {
    currentAnnualContribution: number;
    recommendedAnnualContribution: number | null;
    adjustmentNeeded: boolean;
    adjustmentPercentage: number;
    /**
     * What the gap-closing maths asked for before take-home pay was taken into
     * account. Kept so the UI can show the difference between what the forecast
     * wants and what the paychecks allow.
     */
    uncappedAnnualContribution: number | null;
    /** True when the recommendation was trimmed to fit take-home pay. */
    limitedByCapacity: boolean;
    /** Annual amount the ceilings cannot cover. */
    unfundedAnnualGap: number;
  };
  capacityAnalysis: {
    contributors: ContributorCapacity[];
    totalNetAnnual: number;
    totalCapacityAnnual: number;
    totalSharedBenefitAnnual: number;
    /** Current contributions as a share of combined take-home pay. */
    utilizationOfNet: number;
    /** Anyone whose stored contribution is already above their ceiling. */
    overCommitted: ContributorCapacity[];
  };
}

/**
 * Generate comprehensive recommendations based on 6-month forecast and trends
 */
export async function generateRecommendations(
  accountId: number,
  year: number,
  month: number
): Promise<RecommendationOverview> {
  // Get account details
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { incomeRules: { include: { deductions: true } } },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Generate 6-month forecast
  const sixMonthForecast = await generateSixMonthForecast(accountId, year, month);

  // Analyze trends
  const trendAnalysis = await analyzeTrends(accountId, year, month);

  // Calculate current annual contribution
  const currentAnnualContribution = account.incomeRules.reduce((sum: any, rule: any) => {
    const payPeriodsPerYear = getPayPeriodsPerYear(rule.payFrequency);
    return sum + (rule.contributionAmount * payPeriodsPerYear);
  }, 0);

  // What each paycheck can actually carry. Contributions come out of take-home
  // pay, so this is the hard limit on anything recommended below.
  const capacities = account.incomeRules.map(describeCapacity);
  const totalNetAnnual = capacities.reduce((sum, c) => sum + c.netAnnual, 0);
  const totalCapacityAnnual = capacities.reduce((sum, c) => sum + c.capacityAnnual, 0);
  const totalSharedBenefitAnnual = capacities.reduce((sum, c) => sum + c.sharedBenefitAnnual, 0);
  const overCommitted = capacities.filter((c) => c.overCapacity);

  // Generate suggestions
  const suggestions: Suggestion[] = [];

  // Filter to future months only (exclude current month if we're past mid-month)
  const today = new Date();
  const currentDay = today.getDate();
  const futureMonths = sixMonthForecast.months.filter((m, idx) => {
    // Always skip the first month (current month) since we can't significantly affect it
    if (idx === 0) return false;
    return true;
  });

  // 1. Check for balance issues in future months
  const monthsWithIssues = futureMonths.filter(
    m => m.status === 'warning' || m.status === 'danger'
  );

  if (monthsWithIssues.length > 0) {
    const firstIssueMonth = monthsWithIssues[0];
    const severity = firstIssueMonth.status === 'danger' ? 'critical' : 'warning';
    
    suggestions.push({
      type: 'balance',
      severity,
      title: `Balance drops below safe minimum in ${firstIssueMonth.monthName}`,
      description: `Your projected balance will drop to $${firstIssueMonth.lowestBalance.toLocaleString()} on day ${firstIssueMonth.lowestBalanceDay}, which is ${firstIssueMonth.daysBelowSafeMin} day(s) below your safe minimum of $${account.safeMinBalance.toLocaleString()}.`,
      actionable: true,
      recommendedAction: 'Increase contributions or reduce variable expenses',
    });
  }

  // 2. Calculate recommended contribution if needed
  let recommendedAnnualContribution: number | null = null;
  let uncappedAnnualContribution: number | null = null;
  let adjustmentNeeded = false;
  let adjustmentPercentage = 0;
  let limitedByCapacity = false;
  let unfundedAnnualGap = 0;

  // Calculate the monthly growth rate from FUTURE months only
  const futureNetChange = futureMonths.reduce((sum, m) => {
    const monthChange = m.totalIncome - m.totalExpenses;
    return sum + monthChange;
  }, 0);
  const netChangePerMonth = futureMonths.length > 0 ? futureNetChange / futureMonths.length : 0;
  
  // Find the lowest balance in FUTURE months only
  const futureLowestBalance = futureMonths.length > 0 
    ? Math.min(...futureMonths.map(m => m.lowestBalance))
    : sixMonthForecast.overallStatus.lowestBalance;
  
  // Only recommend changes if there's an actual problem with future months
  if (futureLowestBalance < account.safeMinBalance) {
    // Part 1: Cover the immediate shortfall to get back to safe minimum
    let totalAnnualNeeded = 0;
    
    const gap = account.safeMinBalance - futureLowestBalance;
    // We need to cover this gap, but the forecast already includes current contributions
    // So we need enough additional contribution to raise the lowest point above safe minimum
    // Add 100% buffer to ensure we stay comfortably above minimum throughout the period
    totalAnnualNeeded += (gap / 6) * 12 * 2.0;
    
    // Part 2: Also ensure positive growth trend
    if (netChangePerMonth < 150) {
      const targetGrowth = 150; // Target $150/month growth for cushion
      const currentMonthlyChange = netChangePerMonth;
      const neededMonthlyIncrease = targetGrowth - currentMonthlyChange;
      // Convert to annual and add 20% buffer for variability
      totalAnnualNeeded += (neededMonthlyIncrease * 12) * 1.2;
    }
    
    // Round up to nearest $100
    uncappedAnnualContribution = Math.ceil((currentAnnualContribution + totalAnnualNeeded) / 100) * 100;

    // Never ask for more than the paychecks can carry. The arithmetic above
    // only knows about the hole in the forecast; it has no idea what is left
    // after taxes and deductions, and left alone it will happily ask for more
    // than someone takes home.
    recommendedAnnualContribution = Math.min(uncappedAnnualContribution, totalCapacityAnnual);
    limitedByCapacity = uncappedAnnualContribution > totalCapacityAnnual + 0.005;
    unfundedAnnualGap = limitedByCapacity
      ? Math.round((uncappedAnnualContribution - totalCapacityAnnual) * 100) / 100
      : 0;

    adjustmentPercentage =
      currentAnnualContribution > 0
        ? ((recommendedAnnualContribution - currentAnnualContribution) / currentAnnualContribution) * 100
        : 0;

    // Only flag as needing adjustment if the increase is meaningful (at least 0.5% or $500/year)
    const annualIncrease = recommendedAnnualContribution - currentAnnualContribution;
    if (adjustmentPercentage >= 0.5 && annualIncrease >= 500) {
      adjustmentNeeded = true;

      suggestions.push({
        type: 'contribution',
        severity: 'warning',
        title: `Increase contributions by ${Math.round(adjustmentPercentage)}%`,
        description: `To maintain a safe balance and achieve positive growth, increase annual contributions from $${currentAnnualContribution.toLocaleString()} to $${recommendedAnnualContribution.toLocaleString()}. That is ${Math.round((recommendedAnnualContribution / totalNetAnnual) * 100)}% of your combined take-home pay.`,
        actionable: true,
        recommendedAction: `Increase monthly contributions by approximately $${Math.round(annualIncrease / 12).toLocaleString()}`,
      });
    }

    // The important case: the forecast needs more than the paychecks can give.
    // Saying "contribute more" here would be asking for money that does not
    // exist, so say what it would actually take instead.
    if (limitedByCapacity) {
      const monthlyGap = Math.round(unfundedAnnualGap / 12);
      suggestions.push({
        type: 'contribution',
        severity: 'critical',
        title: 'Contributions alone cannot close this gap',
        description:
          `Covering the shortfall would take $${uncappedAnnualContribution.toLocaleString()} a year, but ` +
          `$${Math.round(totalCapacityAnnual).toLocaleString()} is everything the paychecks can carry ` +
          `(${Math.round(capacities[0]?.maxContributionPct * 100 || 80)}% of $${Math.round(totalNetAnnual).toLocaleString()} take-home). ` +
          `That leaves $${unfundedAnnualGap.toLocaleString()} a year, about $${monthlyGap.toLocaleString()} a month, with no paycheck behind it.`,
        actionable: true,
        recommendedAction: `Cut about $${monthlyGap.toLocaleString()} a month from shared expenses, or raise the contribution ceiling if you can live on less`,
      });
    }
  }

  // 2b. Flag contributions that are already beyond what a paycheck can carry.
  if (overCommitted.length > 0) {
    const worst = [...overCommitted].sort((a, b) => b.utilizationOfNet - a.utilizationOfNet)[0];
    suggestions.push({
      type: 'contribution',
      severity: 'critical',
      title: `${worst.name} is set beyond what that paycheck can carry`,
      description:
        `The contribution of $${worst.currentPerPaycheck.toLocaleString()} a paycheck is ` +
        `${Math.round(worst.utilizationOfNet * 100)}% of $${worst.netPerPaycheck.toLocaleString()} take-home` +
        `${worst.paycheck.isEstimate ? ' (estimated from salary and deductions)' : ''}. ` +
        `The ceiling is $${worst.capacityPerPaycheck.toLocaleString()}.`,
      actionable: true,
      recommendedAction: 'Recalculate contributions in Setup to split the bill within everyone\'s take-home pay',
    });
  }

  // 3. Check for expense trends
  if (trendAnalysis.summary.totalAlerts > 0) {
    const alertCategories = trendAnalysis.expenses.filter(e => e.alert);
    
    suggestions.push({
      type: 'trend',
      severity: 'warning',
      title: `${trendAnalysis.summary.totalAlerts} expense ${trendAnalysis.summary.totalAlerts === 1 ? 'category' : 'categories'} trending higher`,
      description: `These expenses are currently 15%+ above their 6-month average: ${alertCategories.map(e => e.expenseName).join(', ')}.`,
      actionable: true,
      recommendedAction: 'Review these expenses and consider adjusting your budget estimates',
    });
  }

  // 4. Check for positive trends
  if (trendAnalysis.summary.totalDecreasingCategories > 0) {
    suggestions.push({
      type: 'trend',
      severity: 'info',
      title: `${trendAnalysis.summary.totalDecreasingCategories} expense ${trendAnalysis.summary.totalDecreasingCategories === 1 ? 'category is' : 'categories are'} trending lower`,
      description: `Good news! Some of your variable expenses are decreasing compared to recent months.`,
      actionable: false,
    });
  }

  // 5. Check overall financial trajectory
  if (netChangePerMonth > 0 && !adjustmentNeeded) {
    suggestions.push({
      type: 'balance',
      severity: 'info',
      title: 'Account growing steadily',
      description: `Your account is projected to grow by an average of $${Math.round(netChangePerMonth).toLocaleString()} per month over the next 6 months.`,
      actionable: false,
    });
  } else if (netChangePerMonth < -50 && !adjustmentNeeded) {
    // Only show this warning if we haven't already addressed it in the contribution recommendation
    suggestions.push({
      type: 'balance',
      severity: 'warning',
      title: 'Account balance declining',
      description: `Your account is projected to decrease by an average of $${Math.abs(Math.round(netChangePerMonth)).toLocaleString()} per month. This trend may require attention.`,
      actionable: true,
      recommendedAction: 'Review expenses and consider increasing contributions',
    });
  }

  // 6. Check for upcoming high-expense months
  const highestExpenseMonth = sixMonthForecast.months.reduce((max, m) => 
    m.totalExpenses > max.totalExpenses ? m : max
  );
  
  const averageMonthlyExpense = sixMonthForecast.months.reduce((sum, m) => sum + m.totalExpenses, 0) / 6;
  
  if (highestExpenseMonth.totalExpenses > averageMonthlyExpense * 1.2) {
    suggestions.push({
      type: 'expense',
      severity: 'info',
      title: `${highestExpenseMonth.monthName} has higher than average expenses`,
      description: `Expected expenses of $${highestExpenseMonth.totalExpenses.toLocaleString()} are ${Math.round(((highestExpenseMonth.totalExpenses - averageMonthlyExpense) / averageMonthlyExpense) * 100)}% above your 6-month average.`,
      actionable: false,
    });
  }

  // Sort suggestions by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    accountId,
    year,
    month,
    sixMonthForecast,
    trendAnalysis,
    suggestions,
    contributionAnalysis: {
      currentAnnualContribution: Math.round(currentAnnualContribution * 100) / 100,
      recommendedAnnualContribution,
      adjustmentNeeded,
      adjustmentPercentage: Math.round(adjustmentPercentage * 100) / 100,
      uncappedAnnualContribution,
      limitedByCapacity,
      unfundedAnnualGap,
    },
    capacityAnalysis: {
      contributors: capacities,
      totalNetAnnual: Math.round(totalNetAnnual * 100) / 100,
      totalCapacityAnnual: Math.round(totalCapacityAnnual * 100) / 100,
      totalSharedBenefitAnnual: Math.round(totalSharedBenefitAnnual * 100) / 100,
      utilizationOfNet: totalNetAnnual > 0 ? currentAnnualContribution / totalNetAnnual : 0,
      overCommitted,
    },
  };
}

function getPayPeriodsPerYear(payFrequency: string): number {
  switch (payFrequency) {
    case 'weekly':
      return 52;
    case 'bi_weekly':
      return 26;
    case 'semi_monthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 24;
  }
}
