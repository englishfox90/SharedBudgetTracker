import { prisma } from '@/lib/prisma';
import { getVariableExpenseEstimates } from '@/lib/variable-expenses-advanced';
import { differenceInDays, isWithinInterval, parseISO } from 'date-fns';

/**
 * Configuration constants for trend analysis
 */
const TREND_THRESHOLD_HIGH = 1.10; // 10% over baseline = "Trending Higher"
const TREND_THRESHOLD_LOW = 0.90;  // 10% under baseline = "Trending Lower"
const TREND_IMPACT_CAP = 0.25;     // Cap trend impact at ±25% for remaining predictions

/**
 * Result of period trend forecast analysis
 */
export interface PeriodTrendForecast {
  // Period definition
  periodStart: Date;
  periodEnd: Date;
  asOfDate: Date;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;

  // Baseline model expectations
  baselineFullPeriodSpend: number;
  expectedToDate: number;
  expectedRemaining: number;

  // Actual current state
  actualToDate: number;

  // Trend analysis
  trendRatio: number; // actualToDate / expectedToDate
  trendLabel: 'Trending Higher' | 'Trending Lower' | 'On Track';
  trendPercentage: number; // (trendRatio - 1) * 100

  // Predictions
  predictedRemaining: number; // Trend-adjusted
  predictedFullPeriodSpend: number;
  predictedEndOfPeriodBalance: number;

  // Breakdown info
  baselineWeightToDate: number;
  baselineWeightRemaining: number;
  baselineWeightFullPeriod: number;
  fractionElapsed: number; // 0-1
  
  // Daily breakdown for remaining days
  dailyForecasts: Array<{
    date: string;
    predictedSpend: number;
  }>;
}

/**
 * Calculate period trend forecast for a variable expense
 * 
 * @param recurringExpenseId - The variable expense to analyze
 * @param periodStart - Start date of the period (e.g., statement start)
 * @param periodEnd - End date of the period (e.g., statement end)
 * @param currentBalance - Current actual spend/balance for this period
 * @param asOfDate - Date to evaluate as "today" (defaults to now)
 */
export async function calculatePeriodTrendForecast(
  recurringExpenseId: number,
  periodStart: Date,
  periodEnd: Date,
  currentBalance: number,
  asOfDate: Date = new Date()
): Promise<PeriodTrendForecast> {
  
  // Validate inputs
  if (periodStart >= periodEnd) {
    throw new Error('Period start must be before period end');
  }
  
  if (asOfDate < periodStart) {
    throw new Error('As-of date cannot be before period start');
  }

  // Get the recurring expense and its account
  const expense = await prisma.recurringExpense.findUnique({
    where: { id: recurringExpenseId },
    include: { account: true },
  });

  if (!expense) {
    throw new Error('Recurring expense not found');
  }

  if (!expense.isVariable) {
    throw new Error('Period trend forecast is only applicable to variable expenses');
  }

  // Calculate period metrics
  const totalDays = differenceInDays(periodEnd, periodStart) + 1;
  const daysElapsed = Math.min(
    differenceInDays(asOfDate, periodStart) + 1,
    totalDays
  );
  const daysRemaining = totalDays - daysElapsed;

  // Get baseline full-period estimate from advanced forecasting model
  // Use the month/year of period start for the forecast
  const targetYear = periodStart.getFullYear();
  const targetMonth = periodStart.getMonth() + 1;

  const variableEstimates = await getVariableExpenseEstimates(
    expense.accountId,
    targetYear,
    targetMonth
  );

  const baselineFullPeriodSpend = variableEstimates[recurringExpenseId] || expense.amount;

  // Get daily breakdown weights for this expense
  const dailyBreakdown = await getDailyBreakdownWeights(
    recurringExpenseId,
    periodStart,
    periodEnd
  );

  // Calculate baseline weights for elapsed and remaining portions
  const { weightToDate, weightRemaining, weightTotal } = partitionWeightsByDate(
    dailyBreakdown,
    periodStart,
    asOfDate,
    periodEnd
  );

  // Calculate baseline expectations
  const fractionElapsed = weightTotal > 0 ? weightToDate / weightTotal : daysElapsed / totalDays;
  const fractionRemaining = weightTotal > 0 ? weightRemaining / weightTotal : daysRemaining / totalDays;

  const expectedToDate = baselineFullPeriodSpend * fractionElapsed;
  const expectedRemaining = baselineFullPeriodSpend * fractionRemaining;

  // Calculate trend
  const actualToDate = Math.abs(currentBalance); // Treat as positive spend
  const trendRatio = expectedToDate > 0 ? actualToDate / expectedToDate : 1.0;
  const trendPercentage = (trendRatio - 1) * 100;

  // Classify trend
  let trendLabel: 'Trending Higher' | 'Trending Lower' | 'On Track';
  if (trendRatio >= TREND_THRESHOLD_HIGH) {
    trendLabel = 'Trending Higher';
  } else if (trendRatio <= TREND_THRESHOLD_LOW) {
    trendLabel = 'Trending Lower';
  } else {
    trendLabel = 'On Track';
  }

  // Calculate predicted remaining using weighted approach:
  // 1. Current period daily rate (highest weight)
  // 2. Recent 3-month daily rates (medium weight)
  // 3. Historical daily pattern for remaining days (lower weight)
  const { predictedRemaining, dailyForecasts } = await calculateWeightedPrediction(
    recurringExpenseId,
    expense.accountId,
    actualToDate,
    daysElapsed,
    daysRemaining,
    asOfDate,
    periodEnd,
    dailyBreakdown
  );

  // Predict full period and end balance
  const predictedFullPeriodSpend = actualToDate + predictedRemaining;
  const predictedEndOfPeriodBalance = currentBalance + predictedRemaining;

  return {
    periodStart,
    periodEnd,
    asOfDate,
    daysElapsed,
    daysRemaining,
    totalDays,
    baselineFullPeriodSpend,
    expectedToDate,
    expectedRemaining,
    actualToDate,
    trendRatio,
    trendLabel,
    trendPercentage,
    predictedRemaining,
    predictedFullPeriodSpend,
    predictedEndOfPeriodBalance,
    baselineWeightToDate: weightToDate,
    baselineWeightRemaining: weightRemaining,
    baselineWeightFullPeriod: weightTotal,
    fractionElapsed,
    dailyForecasts,
  };
}

/**
 * Calculate weighted prediction for remaining spend
 * Combines:
 * - Current period daily rate (50% weight)
 * - Recent 3-month daily rates (30% weight)
 * - Historical daily pattern weights (20% weight)
 */
async function calculateWeightedPrediction(
  recurringExpenseId: number,
  accountId: number,
  actualToDate: number,
  daysElapsed: number,
  daysRemaining: number,
  asOfDate: Date,
  periodEnd: Date,
  dailyBreakdown: Map<string, number>
): Promise<{ predictedRemaining: number; dailyForecasts: Array<{ date: string; predictedSpend: number }> }> {
  const W_CURRENT = 0.50;  // Weight for current period rate
  const W_RECENT = 0.30;   // Weight for recent 3-month rate
  const W_PATTERN = 0.20;  // Weight for historical daily pattern

  // 1. Current period daily rate (baseline for all days)
  const currentPeriodRate = daysElapsed > 0 ? actualToDate / daysElapsed : 0;

  // 2. Recent 3-month daily rate (baseline for all days)
  const recentRate = await getRecentMonthlyDailyRate(recurringExpenseId, asOfDate, 3);

  // Calculate base weighted rate (current + recent)
  let baseWeightedRate = 0;
  let baseWeight = 0;

  if (currentPeriodRate > 0) {
    baseWeightedRate += currentPeriodRate * W_CURRENT;
    baseWeight += W_CURRENT;
  }

  if (recentRate > 0) {
    baseWeightedRate += recentRate * W_RECENT;
    baseWeight += W_RECENT;
  }

  const baseRate = baseWeight > 0 ? baseWeightedRate / baseWeight : currentPeriodRate;

  // 3. Calculate average historical daily pattern to use as scaling reference
  let totalHistoricalWeight = 0;
  let historicalDayCount = 0;
  
  let tempDate = new Date(asOfDate);
  tempDate.setDate(tempDate.getDate() + 1);
  
  while (tempDate <= periodEnd) {
    const dateKey = tempDate.toISOString().split('T')[0];
    const weight = dailyBreakdown.get(dateKey) || 0;
    if (weight > 0) {
      totalHistoricalWeight += weight;
      historicalDayCount++;
    }
    tempDate = new Date(tempDate);
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  const avgHistoricalDailyWeight = historicalDayCount > 0 ? totalHistoricalWeight / historicalDayCount : 0;

  // 4. Generate daily forecasts with scaled historical patterns
  const dailyForecasts: Array<{ date: string; predictedSpend: number }> = [];
  let totalPredicted = 0;
  let currentDate = new Date(asOfDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  while (currentDate <= periodEnd) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Get historical pattern weight for this specific day
    const historicalDayWeight = dailyBreakdown.get(dateKey) || 0;

    // Combine base rate (current + recent) with scaled historical day pattern
    let dayPrediction: number;
    
    if (historicalDayWeight > 0 && avgHistoricalDailyWeight > 0) {
      // Scale the historical pattern: ratio of this day vs average day
      const dayPatternRatio = historicalDayWeight / avgHistoricalDailyWeight;
      
      // Apply pattern to base rate: blend base rate with pattern-adjusted rate
      const patternAdjustedRate = baseRate * dayPatternRatio;
      dayPrediction = baseRate * (1 - W_PATTERN) + patternAdjustedRate * W_PATTERN;
    } else {
      // No historical data for this day, use base rate
      dayPrediction = baseRate;
    }

    dailyForecasts.push({
      date: dateKey,
      predictedSpend: dayPrediction,
    });
    
    totalPredicted += dayPrediction;
    
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    predictedRemaining: totalPredicted,
    dailyForecasts,
  };
}

/**
 * Get average daily spending rate from recent N months
 */
async function getRecentMonthlyDailyRate(
  recurringExpenseId: number,
  asOfDate: Date,
  monthsBack: number
): Promise<number> {
  const startDate = new Date(asOfDate);
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const transactions = await prisma.transaction.findMany({
    where: {
      recurringExpenseId,
      date: {
        gte: startDate,
        lt: asOfDate,
      },
    },
  });

  if (transactions.length === 0) {
    return 0;
  }

  const totalSpend = transactions.reduce((sum: number, txn: any) => sum + Math.abs(txn.amount), 0);
  const daysDiff = differenceInDays(asOfDate, startDate);

  return daysDiff > 0 ? totalSpend / daysDiff : 0;
}

/**
 * Get pattern-based rate using historical daily weights for remaining days
 */
async function getPatternBasedRate(
  recurringExpenseId: number,
  asOfDate: Date,
  periodEnd: Date,
  dailyBreakdown: Map<string, number>,
  daysRemaining: number
): Promise<number> {
  if (dailyBreakdown.size === 0 || daysRemaining === 0) {
    return 0;
  }

  // Sum the weights for remaining days
  let weightSum = 0;
  let currentDate = new Date(asOfDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  while (currentDate <= periodEnd) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const weight = dailyBreakdown.get(dateKey) || 0;
    weightSum += weight;
    
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Average weight per day in remaining period
  return daysRemaining > 0 ? weightSum / daysRemaining : 0;
}

/**
 * Get daily breakdown weights for a specific period
 */
async function getDailyBreakdownWeights(
  recurringExpenseId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<Map<string, number>> {
  const weights = new Map<string, number>();

  // Get all daily averages for this expense
  const dailyAverages = await prisma.dailySpendingAverage.findMany({
    where: { recurringExpenseId },
  });

  if (dailyAverages.length === 0) {
    // No daily breakdown data - return empty map, will fall back to uniform distribution
    return weights;
  }

  // Create a map of month-day to average weight
  const averageMap = new Map<string, number>();
  for (const avg of dailyAverages) {
    const key = `${String(avg.month).padStart(2, '0')}-${String(avg.day).padStart(2, '0')}`;
    averageMap.set(key, avg.dailyAverage);
  }

  // For each day in the period, get its weight
  let currentDate = new Date(periodStart);
  while (currentDate <= periodEnd) {
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateKey = currentDate.toISOString().split('T')[0];
    
    const weight = averageMap.get(key) || 0;
    weights.set(dateKey, weight);
    
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return weights;
}

/**
 * Partition daily weights into elapsed and remaining portions
 */
function partitionWeightsByDate(
  dailyWeights: Map<string, number>,
  periodStart: Date,
  asOfDate: Date,
  periodEnd: Date
): {
  weightToDate: number;
  weightRemaining: number;
  weightTotal: number;
} {
  let weightToDate = 0;
  let weightRemaining = 0;

  for (const [dateStr, weight] of dailyWeights.entries()) {
    const date = parseISO(dateStr);
    
    if (date >= periodStart && date <= asOfDate) {
      weightToDate += weight;
    } else if (date > asOfDate && date <= periodEnd) {
      weightRemaining += weight;
    }
  }

  const weightTotal = weightToDate + weightRemaining;

  return { weightToDate, weightRemaining, weightTotal };
}
