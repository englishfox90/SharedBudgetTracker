import { generateForecast, ForecastResult } from '@/lib/forecast';
import { formatDateShortUTC } from '@/lib/date-utils';

export interface MonthSummary {
  year: number;
  month: number;
  monthName: string;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalExpenses: number;
  openingBalance: number;
  closingBalance: number;
  lowestBalance: number;
  lowestBalanceDay: number;
  status: 'safe' | 'warning' | 'danger';
  daysBelowSafeMin: number;
}

export interface SixMonthForecast {
  accountId: number;
  safeMinBalance: number;
  months: MonthSummary[];
  overallStatus: {
    lowestBalance: number;
    lowestBalanceMonth: string;
    totalProjectedIncome: number;
    totalProjectedExpenses: number;
    netChange: number;
  };
}

/**
 * Generate a 6-month rolling forecast starting from the given month
 */
export async function generateSixMonthForecast(
  accountId: number,
  startYear: number,
  startMonth: number
): Promise<SixMonthForecast> {
  const months: MonthSummary[] = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  // Generate forecasts for 6 months
  for (let i = 0; i < 6; i++) {
    const forecast = await generateForecast(accountId, currentYear, currentMonth);
    const summary = summarizeMonth(forecast);
    months.push(summary);

    // Move to next month
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
  }

  // Calculate overall statistics
  const lowestBalance = Math.min(...months.map(m => m.lowestBalance));
  const lowestBalanceMonth = months.find(m => m.lowestBalance === lowestBalance);
  const totalProjectedIncome = months.reduce((sum, m) => sum + m.totalIncome, 0);
  const totalProjectedExpenses = months.reduce((sum, m) => sum + m.totalExpenses, 0);

  return {
    accountId,
    safeMinBalance: months[0].status !== 'safe' ? months[0].lowestBalance : 0, // Get from first month
    months,
    overallStatus: {
      lowestBalance,
      lowestBalanceMonth: lowestBalanceMonth ? lowestBalanceMonth.monthName : '',
      totalProjectedIncome: Math.round(totalProjectedIncome * 100) / 100,
      totalProjectedExpenses: Math.round(totalProjectedExpenses * 100) / 100,
      netChange: Math.round((totalProjectedIncome - totalProjectedExpenses) * 100) / 100,
    },
  };
}

/**
 * Summarize a single month forecast into key metrics
 */
function summarizeMonth(forecast: ForecastResult): MonthSummary {
  const monthName = new Date(Date.UTC(forecast.year, forecast.month - 1, 1))
    .toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Calculate totals from events
  let totalIncome = 0;
  let totalFixedExpenses = 0;
  let totalVariableExpenses = 0;

  forecast.days.forEach(day => {
    day.events.forEach(event => {
      if (event.amount > 0) {
        totalIncome += event.amount;
      } else {
        const absAmount = Math.abs(event.amount);
        // Variable expenses have "(estimated)" in description
        if (event.description.includes('(estimated)')) {
          totalVariableExpenses += absAmount;
        } else {
          totalFixedExpenses += absAmount;
        }
      }
    });
  });

  const totalExpenses = totalFixedExpenses + totalVariableExpenses;
  const openingBalance = forecast.startingBalance;
  const closingBalance = forecast.days[forecast.days.length - 1]?.closingBalance || openingBalance;
  const lowestBalance = forecast.overallStatus.minBalance;
  
  // Find the day with lowest balance
  const lowestDay = forecast.days.find(d => d.closingBalance === lowestBalance);
  const lowestBalanceDay = lowestDay ? new Date(lowestDay.date).getUTCDate() : 1;

  // Determine status
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (forecast.overallStatus.daysBelowSafeMin > 0) {
    status = forecast.overallStatus.daysBelowSafeMin > 7 ? 'danger' : 'warning';
  }

  return {
    year: forecast.year,
    month: forecast.month,
    monthName,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalFixedExpenses: Math.round(totalFixedExpenses * 100) / 100,
    totalVariableExpenses: Math.round(totalVariableExpenses * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    openingBalance: Math.round(openingBalance * 100) / 100,
    closingBalance: Math.round(closingBalance * 100) / 100,
    lowestBalance: Math.round(lowestBalance * 100) / 100,
    lowestBalanceDay,
    status,
    daysBelowSafeMin: forecast.overallStatus.daysBelowSafeMin,
  };
}
