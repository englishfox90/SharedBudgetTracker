import { prisma } from '@/lib/prisma';
import { createDateUTC } from '@/lib/date-utils';

/**
 * Monthly aggregated spending data
 */
interface MonthlyTotal {
  year: number;
  month: number; // 1-12
  total: number;
}

/**
 * Estimation result with metadata
 */
interface EstimationResult {
  estimate: number;
  seasonalEstimate: number | null;
  recencyEstimate: number | null;
  trendSlope: number;
  dataPointsUsed: number;
}

/**
 * Configuration constants
 */
const RECENCY_WINDOW = 3; // months for recency calculation
const TREND_WINDOW = 12; // months for trend analysis
const MIN_TREND_DATA = 6; // minimum months needed for trend calculation
const MIN_DATA_FOR_SEASONAL = 3; // minimum total data points

const W_SEASONAL = 0.4; // weight for seasonal component
const W_RECENCY = 0.6; // weight for recency component

const MAX_TREND_IMPACT = 0.10; // max ±10% change from trend

/**
 * Get variable expense estimates using advanced predictive model
 * 
 * Algorithm includes:
 * - Inflation adjustment (relative to target month)
 * - Seasonal patterns (month-of-year averages)
 * - Recency weighting (exponential decay)
 * - Trend detection (linear regression)
 */
export async function getVariableExpenseEstimates(
  accountId: number,
  targetYear: number,
  targetMonth: number
): Promise<Record<number, number>> {
  // Get account for inflation rate
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return {};
  }

  const annualInflationRate = account.inflationRate / 100; // Convert from percentage

  // Get all variable recurring expenses
  const expenses = await prisma.recurringExpense.findMany({
    where: {
      accountId,
      isVariable: true,
    },
  });

  const estimates: Record<number, number> = {};

  for (const expense of expenses as any) {
    const result = await estimateVariableExpense(
      expense.id,
      expense.amount,
      targetYear,
      targetMonth,
      annualInflationRate
    );
    
    estimates[expense.id] = result.estimate;
  }

  return estimates;
}

/**
 * Estimate a single variable expense using the predictive model
 */
async function estimateVariableExpense(
  recurringExpenseId: number,
  configuredAmount: number,
  targetYear: number,
  targetMonth: number,
  annualInflationRate: number
): Promise<EstimationResult> {
  // Step 1: Build monthly history
  const monthlyHistory = await buildMonthlyHistory(recurringExpenseId);

  // Not enough data - use configured amount
  if (monthlyHistory.length < MIN_DATA_FOR_SEASONAL) {
    return {
      estimate: configuredAmount,
      seasonalEstimate: null,
      recencyEstimate: null,
      trendSlope: 0,
      dataPointsUsed: monthlyHistory.length,
    };
  }

  // Step 2: Inflation adjustment
  const inflationAdjustedHistory = monthlyHistory.map(m => ({
    ...m,
    inflationAdjustedTotal: adjustForInflation(
      m.total,
      m.year,
      m.month,
      targetYear,
      targetMonth,
      annualInflationRate
    ),
  }));

  // Step 3: Seasonal component
  const seasonalEstimate = calculateSeasonalEstimate(
    inflationAdjustedHistory,
    targetMonth
  );

  // Step 4: Recency component
  const recencyEstimate = calculateRecencyEstimate(
    inflationAdjustedHistory,
    targetYear,
    targetMonth
  );

  // Step 5: Trend component
  const trendSlope = calculateTrendSlope(
    inflationAdjustedHistory,
    targetYear,
    targetMonth
  );

  // Step 6: Combine seasonality + recency
  let baseEstimate: number;
  
  if (seasonalEstimate !== null && recencyEstimate !== null) {
    baseEstimate = W_SEASONAL * seasonalEstimate + W_RECENCY * recencyEstimate;
  } else if (recencyEstimate !== null) {
    baseEstimate = recencyEstimate;
  } else if (seasonalEstimate !== null) {
    baseEstimate = seasonalEstimate;
  } else {
    baseEstimate = configuredAmount;
  }

  // Step 7: Apply trend with clamping
  const lastHistoryPoint = inflationAdjustedHistory[inflationAdjustedHistory.length - 1];
  const monthsAhead = lastHistoryPoint
    ? calculateMonthsDiff(
        lastHistoryPoint.year,
        lastHistoryPoint.month,
        targetYear,
        targetMonth
      )
    : 0;

  const rawTrendEstimate = baseEstimate + trendSlope * monthsAhead;
  const trendAdjustedEstimate = clamp(
    rawTrendEstimate,
    baseEstimate * (1 - MAX_TREND_IMPACT),
    baseEstimate * (1 + MAX_TREND_IMPACT)
  );

  // Final estimate - round to 2 decimals
  const finalEstimate = Math.max(0, Math.round(trendAdjustedEstimate * 100) / 100);

  return {
    estimate: finalEstimate,
    seasonalEstimate,
    recencyEstimate,
    trendSlope,
    dataPointsUsed: monthlyHistory.length,
  };
}

/**
 * Build monthly aggregated history from transactions
 */
async function buildMonthlyHistory(
  recurringExpenseId: number
): Promise<MonthlyTotal[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      recurringExpenseId,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Group by year-month
  const monthlyMap = new Map<string, MonthlyTotal>();

  for (const txn of transactions as any) {
    const date = new Date(txn.date);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    const key = `${year}-${month}`;

    const existing = monthlyMap.get(key);
    if (existing) {
      existing.total += Math.abs(txn.amount);
    } else {
      monthlyMap.set(key, { year, month, total: Math.abs(txn.amount) });
    }
  }

  // Convert to sorted array
  return Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

/**
 * Adjust historical amount for inflation relative to target month
 */
function adjustForInflation(
  historicalTotal: number,
  historicalYear: number,
  historicalMonth: number,
  targetYear: number,
  targetMonth: number,
  annualInflationRate: number
): number {
  const monthsDiff = calculateMonthsDiff(
    historicalYear,
    historicalMonth,
    targetYear,
    targetMonth
  );
  
  const yearsDiff = monthsDiff / 12;
  const inflationFactor = Math.pow(1 + annualInflationRate, yearsDiff);
  
  return historicalTotal * inflationFactor;
}

/**
 * Calculate seasonal estimate (average for same month across years)
 */
function calculateSeasonalEstimate(
  history: Array<MonthlyTotal & { inflationAdjustedTotal: number }>,
  targetMonth: number
): number | null {
  const sameMonthValues = history
    .filter(m => m.month === targetMonth)
    .map(m => m.inflationAdjustedTotal);

  if (sameMonthValues.length === 0) {
    return null;
  }

  const average = sameMonthValues.reduce((sum, val) => sum + val, 0) / sameMonthValues.length;
  return Math.round(average * 100) / 100;
}

/**
 * Calculate recency-weighted estimate
 */
function calculateRecencyEstimate(
  history: Array<MonthlyTotal & { inflationAdjustedTotal: number }>,
  targetYear: number,
  targetMonth: number
): number | null {
  // Get months before target month
  const beforeTarget = history.filter(m => {
    if (m.year < targetYear) return true;
    if (m.year === targetYear && m.month < targetMonth) return true;
    return false;
  });

  if (beforeTarget.length === 0) {
    return null;
  }

  // Take last N months
  const recentMonths = beforeTarget.slice(-RECENCY_WINDOW);
  
  // Define weights based on how many months we have
  let weights: number[];
  if (recentMonths.length === 3) {
    weights = [0.2, 0.3, 0.5]; // oldest to newest
  } else if (recentMonths.length === 2) {
    weights = [0.4, 0.6];
  } else {
    weights = [1.0];
  }

  // Calculate weighted average
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < recentMonths.length; i++) {
    weightedSum += recentMonths[i].inflationAdjustedTotal * weights[i];
    totalWeight += weights[i];
  }

  const weightedAverage = weightedSum / totalWeight;
  return Math.round(weightedAverage * 100) / 100;
}

/**
 * Calculate trend slope using linear regression
 */
function calculateTrendSlope(
  history: Array<MonthlyTotal & { inflationAdjustedTotal: number }>,
  targetYear: number,
  targetMonth: number
): number {
  // Get months before target
  const beforeTarget = history.filter(m => {
    if (m.year < targetYear) return true;
    if (m.year === targetYear && m.month < targetMonth) return true;
    return false;
  });

  // Take last 12 months for trend
  const trendWindow = beforeTarget.slice(-TREND_WINDOW);

  if (trendWindow.length < MIN_TREND_DATA) {
    return 0; // Not enough data for trend
  }

  // Linear regression: y = a + bx
  // where x is time index (0, 1, 2, ...) and y is inflationAdjustedTotal
  const n = trendWindow.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = trendWindow[i].inflationAdjustedTotal;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  // Calculate slope: b = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
  const denominator = n * sumX2 - sumX * sumX;
  
  if (denominator === 0) {
    return 0;
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  
  return Math.round(slope * 100) / 100;
}

/**
 * Calculate difference in months between two dates
 */
function calculateMonthsDiff(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): number {
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Legacy API compatibility - uses current month
 */
export async function calculateAverageVariableExpense(
  accountId: number,
  recurringExpenseId: number,
  monthsBack: number = 3
): Promise<number> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const estimates = await getVariableExpenseEstimates(
    accountId,
    currentYear,
    currentMonth
  );

  return estimates[recurringExpenseId] || 0;
}
