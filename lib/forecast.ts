import { prisma } from '@/lib/prisma';
import { getVariableExpenseEstimates } from '@/lib/variable-expenses-advanced';
import { getDaysInMonth, setDate, isBefore, isAfter, isSameDay, format } from 'date-fns';

export interface CashEvent {
  date: Date;
  description: string;
  amount: number; // positive = deposit, negative = withdrawal
  type: 'income' | 'fixed_expense' | 'variable_expense';
  actualized?: boolean; // true if this is an actual transaction, not a forecast
  transactionId?: number; // ID of the transaction if actualized
  incomeRuleId?: number; // ID of the income rule this event comes from
  recurringExpenseId?: number; // ID of the recurring expense this event comes from
  forecastedAmount?: number; // Original forecasted amount (for variance calculation)
}

export interface DayForecast {
  date: string; // ISO date string
  events: CashEvent[];
  openingBalance: number;
  netChange: number;
  closingBalance: number;
  belowSafeMin: boolean;
}

export interface ForecastResult {
  accountId: number;
  year: number;
  month: number;
  startingBalance: number;
  isStartMonth: boolean;
  safeMinBalance: number;
  days: DayForecast[];
  overallStatus: {
    minBalance: number;
    daysBelowSafeMin: number;
  };
}

/**
 * Generate cash events for a given month
 */
async function generateCashEvents(
  accountId: number,
  year: number,
  month: number
): Promise<CashEvent[]> {
  const events: CashEvent[] = [];

  // Get income rules
  const incomeRules = await prisma.incomeRule.findMany({
    where: { accountId },
  });

  // Get recurring expenses
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: { accountId },
  });

  // Get variable expense estimates (using advanced predictive model)
  const variableEstimates = await getVariableExpenseEstimates(accountId, year, month);

  // Get one-time transactions for this month (using UTC dates)
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  type TransactionType = typeof transactions[number];

  const monthDate = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(monthDate);

  // Generate income events
  for (const rule of incomeRules) {
    const payDays = JSON.parse(rule.payDays) as number[];
    const depositAmount = rule.contributionAmount;

    for (const day of payDays) {
      if (day <= daysInMonth) {
        events.push({
          date: new Date(Date.UTC(year, month - 1, day)),
          description: `${rule.name} contribution`,
          amount: Math.round(depositAmount * 100) / 100,
          type: 'income',
          incomeRuleId: rule.id,
        });
      }
    }
  }

  // Generate expense events
  for (const expense of recurringExpenses) {
    const frequency = expense.frequency || 'monthly';
    const expenseDates: Date[] = [];

    if (frequency === 'weekly') {
      // dayOfMonth is actually day of week (0-6)
      const dayOfWeek = expense.dayOfMonth;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCDay() === dayOfWeek) {
          expenseDates.push(date);
        }
      }
    } else if (frequency === 'bi_weekly') {
      // For bi-weekly, we'd need a start date reference
      // For now, get weeks that match the day of week
      const dayOfWeek = expense.dayOfMonth;
      let weekCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCDay() === dayOfWeek) {
          if (weekCount % 2 === 0) {
            expenseDates.push(date);
          }
          weekCount++;
        }
      }
    } else if (frequency === 'semi_monthly') {
      // Two times per month - typically 1st and 15th
      const day = Math.min(expense.dayOfMonth, daysInMonth);
      expenseDates.push(new Date(Date.UTC(year, month - 1, day)));
      const day2 = Math.min(expense.dayOfMonth + 14, daysInMonth);
      if (day2 > day) {
        expenseDates.push(new Date(Date.UTC(year, month - 1, day2)));
      }
    } else {
      // Monthly - adjust day if it exceeds month length
      const day = Math.min(expense.dayOfMonth, daysInMonth);
      expenseDates.push(new Date(Date.UTC(year, month - 1, day)));
    }

    for (const expenseDate of expenseDates) {
      // Check if expense is active
      if (expense.activeFrom && isBefore(expenseDate, expense.activeFrom)) {
        continue;
      }
      if (expense.activeTo && isAfter(expenseDate, expense.activeTo)) {
        continue;
      }

      let amount = expense.amount;

      // Use estimated amount for variable expenses
      if (expense.isVariable && variableEstimates[expense.id]) {
        amount = variableEstimates[expense.id];
      }

      events.push({
        date: expenseDate,
        description: expense.isVariable
          ? `${expense.name} (estimated)`
          : expense.name,
        amount: -Math.abs(amount),
        type: expense.isVariable ? 'variable_expense' : 'fixed_expense',
        recurringExpenseId: expense.id,
      });
    }
  }

  // Match forecasted events with actual transactions using foreign keys
  // Transactions with incomeRuleId or recurringExpenseId replace their forecasted events
  // Transactions without these IDs are one-time transactions that get added separately
  
  // Helper to compare just the date part (ignore time)
  function isSameDateIgnoreTime(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
  
  // Track which (sourceId + date) combinations have been actualized
  const actualizedIncomeEvents = new Map<string, TransactionType>(); // key: "incomeRuleId-date"
  const actualizedExpenseEvents = new Map<string, TransactionType>(); // key: "recurringExpenseId-date"
  const incomeRuleTransactions = new Map<number, TransactionType[]>(); // key: incomeRuleId
  const recurringExpenseTransactions = new Map<number, TransactionType[]>(); // key: recurringExpenseId
  const oneOffTransactions: TransactionType[] = [];
  
  console.log('Transactions found for month:', transactions.length);
  
  // Categorize transactions
  for (const transaction of transactions) {
    const transDate = new Date(transaction.date);
    // Use UTC date parts to avoid timezone issues
    const dateKey = `${transDate.getUTCFullYear()}-${transDate.getUTCMonth() + 1}-${transDate.getUTCDate()}`;
    
    console.log('Transaction:', {
      id: transaction.id,
      description: transaction.description,
      date: dateKey,
      incomeRuleId: transaction.incomeRuleId,
      recurringExpenseId: transaction.recurringExpenseId,
      amount: transaction.amount
    });
    
    if (transaction.incomeRuleId) {
      const key = `${transaction.incomeRuleId}-${dateKey}`;
      actualizedIncomeEvents.set(key, transaction);
      
      // Also track by ID for flexible matching
      if (!incomeRuleTransactions.has(transaction.incomeRuleId)) {
        incomeRuleTransactions.set(transaction.incomeRuleId, []);
      }
      incomeRuleTransactions.get(transaction.incomeRuleId)!.push(transaction);
      
      console.log('  -> Mapped to income rule:', key);
    } else if (transaction.recurringExpenseId) {
      const key = `${transaction.recurringExpenseId}-${dateKey}`;
      actualizedExpenseEvents.set(key, transaction);
      
      // Also track by ID for flexible matching
      if (!recurringExpenseTransactions.has(transaction.recurringExpenseId)) {
        recurringExpenseTransactions.set(transaction.recurringExpenseId, []);
      }
      recurringExpenseTransactions.get(transaction.recurringExpenseId)!.push(transaction);
      
      console.log('  -> Mapped to recurring expense:', key);
    } else {
      oneOffTransactions.push(transaction);
      console.log('  -> One-off transaction');
    }
  }
  
  console.log('Income event actualizations:', Array.from(actualizedIncomeEvents.keys()));
  console.log('Expense event actualizations:', Array.from(actualizedExpenseEvents.keys()));
  
  // Track which transactions have been matched to avoid duplicates
  const matchedTransactionIds = new Set<number>();
  
  // Update forecasted events with actual amounts where transactions exist
  for (const event of events) {
    // Use UTC date parts to match transaction keys
    const eventDateKey = `${event.date.getUTCFullYear()}-${event.date.getUTCMonth() + 1}-${event.date.getUTCDate()}`;
    
    if (event.incomeRuleId) {
      const key = `${event.incomeRuleId}-${eventDateKey}`;
      const actualTransaction = actualizedIncomeEvents.get(key);
      
      if (actualTransaction) {
        console.log('Actualizing income event:', key, 'from', event.amount, 'to', actualTransaction.amount);
        event.actualized = true;
        event.forecastedAmount = event.amount; // Store original forecast
        event.date = new Date(actualTransaction.date);
        event.description = actualTransaction.description;
        event.amount = actualTransaction.amount;
        event.transactionId = actualTransaction.id;
        matchedTransactionIds.add(actualTransaction.id);
      } else {
        // If no exact date match, try to find the closest unmatched transaction for this income rule
        const candidates = incomeRuleTransactions.get(event.incomeRuleId) || [];
        
        // Find unmatched transactions and sort by proximity to the scheduled date
        const unmatchedCandidates = candidates
          .filter(t => !matchedTransactionIds.has(t.id))
          .map(t => ({
            transaction: t,
            daysDiff: Math.abs(
              Math.floor((new Date(t.date).getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24))
            )
          }))
          .sort((a, b) => a.daysDiff - b.daysDiff);
        
        // Only match if within 7 days of scheduled date to avoid matching wrong occurrences
        if (unmatchedCandidates.length > 0 && unmatchedCandidates[0].daysDiff <= 7) {
          const closestMatch = unmatchedCandidates[0].transaction;
          console.log('Actualizing income event (flexible):', event.incomeRuleId, 'scheduled:', eventDateKey, 'actual:', new Date(closestMatch.date).toISOString().split('T')[0], 'days diff:', unmatchedCandidates[0].daysDiff);
          event.actualized = true;
          event.forecastedAmount = event.amount; // Store original forecast
          event.date = new Date(closestMatch.date);
          event.description = closestMatch.description;
          event.amount = closestMatch.amount;
          event.transactionId = closestMatch.id;
          matchedTransactionIds.add(closestMatch.id);
        }
      }
    } else if (event.recurringExpenseId) {
      const key = `${event.recurringExpenseId}-${eventDateKey}`;
      const actualTransaction = actualizedExpenseEvents.get(key);
      
      if (actualTransaction) {
        console.log('Actualizing expense event:', key, 'from', event.amount, 'to', actualTransaction.amount);
        event.actualized = true;
        event.forecastedAmount = event.amount; // Store original forecast
        event.date = new Date(actualTransaction.date);
        event.description = actualTransaction.description;
        event.amount = actualTransaction.amount;
        event.transactionId = actualTransaction.id;
        matchedTransactionIds.add(actualTransaction.id);
      } else {
        // If no exact date match, try to find the closest unmatched transaction for this recurring expense
        const candidates = recurringExpenseTransactions.get(event.recurringExpenseId) || [];
        
        // Find unmatched transactions and sort by proximity to the scheduled date
        const unmatchedCandidates = candidates
          .filter(t => !matchedTransactionIds.has(t.id))
          .map(t => ({
            transaction: t,
            daysDiff: Math.abs(
              Math.floor((new Date(t.date).getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24))
            )
          }))
          .sort((a, b) => a.daysDiff - b.daysDiff);
        
        // Only match if within 7 days of scheduled date to avoid matching wrong occurrences
        if (unmatchedCandidates.length > 0 && unmatchedCandidates[0].daysDiff <= 7) {
          const closestMatch = unmatchedCandidates[0].transaction;
          console.log('Actualizing expense event (flexible):', event.recurringExpenseId, 'scheduled:', eventDateKey, 'actual:', new Date(closestMatch.date).toISOString().split('T')[0], 'days diff:', unmatchedCandidates[0].daysDiff);
          event.actualized = true;
          event.forecastedAmount = event.amount; // Store original forecast
          event.date = new Date(closestMatch.date);
          event.description = closestMatch.description;
          event.amount = closestMatch.amount;
          event.transactionId = closestMatch.id;
          matchedTransactionIds.add(closestMatch.id);
        }
      }
    }
  }
  
  // Add unmatched linked transactions as separate events
  for (const [incomeRuleId, txns] of incomeRuleTransactions) {
    for (const txn of txns) {
      if (!matchedTransactionIds.has(txn.id)) {
        events.push({
          date: new Date(txn.date),
          description: txn.description,
          amount: txn.amount,
          type: 'income',
          actualized: true,
          transactionId: txn.id,
          incomeRuleId: txn.incomeRuleId || undefined,
        });
      }
    }
  }
  
  for (const [recurringExpenseId, txns] of recurringExpenseTransactions) {
    for (const txn of txns) {
      if (!matchedTransactionIds.has(txn.id)) {
        events.push({
          date: new Date(txn.date),
          description: txn.description,
          amount: txn.amount,
          type: 'fixed_expense',
          actualized: true,
          transactionId: txn.id,
          recurringExpenseId: txn.recurringExpenseId || undefined,
        });
      }
    }
  }
  
  // Add one-off transactions as separate events
  for (const transaction of oneOffTransactions) {
    events.push({
      date: new Date(transaction.date),
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.amount > 0 ? 'income' : 'fixed_expense',
      actualized: true,
      transactionId: transaction.id,
    });
  }

  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events;
}

/**
 * Generate forecast for a given month
 */
export async function generateForecast(
  accountId: number,
  year: number,
  month: number
): Promise<ForecastResult> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const events = await generateCashEvents(accountId, year, month);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));

  // Check if this month contains the start date
  // Parse as UTC to avoid timezone issues
  const startDate = new Date(account.startDate);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth() + 1; // getUTCMonth() returns 0-11
  const startDay = startDate.getUTCDate();
  
  const isStartMonth = startYear === year && startMonth === month;
  const firstDayToShow = isStartMonth ? startDay : 1;

  console.log('Forecast Debug:', {
    requestedMonth: `${year}-${month}`,
    startDate: account.startDate,
    startYear,
    startMonth,
    startDay,
    isStartMonth,
    firstDayToShow
  });

  const days: DayForecast[] = [];
  
  // Calculate starting balance for this month
  let currentBalance: number;
  if (isStartMonth) {
    // This is the start month - use the account's starting balance as-is
    currentBalance = account.startingBalance;
  } else {
    // For future months, get the closing balance from the previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    
    try {
      const prevMonthForecast = await generateForecast(accountId, prevYear, prevMonth);
      // Get the last day's closing balance from previous month
      const lastDay = prevMonthForecast.days[prevMonthForecast.days.length - 1];
      currentBalance = lastDay ? lastDay.closingBalance : account.startingBalance;
      console.log(`Carrying forward balance from ${prevYear}-${prevMonth}: ${currentBalance}`);
    } catch (error) {
      // If previous month can't be generated (e.g., before start date), use starting balance
      console.log('Could not get previous month balance, using starting balance');
      currentBalance = account.startingBalance;
    }
  }
  
  console.log('Opening balance for first visible day:', currentBalance);
  
  const openingBalanceForMonth = currentBalance; // Store for return value
  let minBalance = currentBalance;
  let daysBelowSafeMin = 0;

  for (let day = firstDayToShow; day <= daysInMonth; day++) {
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const dayEvents = events.filter((e) => {
      return e.date.getUTCFullYear() === year &&
             e.date.getUTCMonth() === month - 1 &&
             e.date.getUTCDate() === day;
    });

    const openingBalance = currentBalance;
    const netChange = dayEvents.reduce((sum, e) => sum + e.amount, 0);
    const closingBalance = openingBalance + netChange;

    const belowSafeMin = closingBalance < account.safeMinBalance;
    if (belowSafeMin) {
      daysBelowSafeMin++;
    }

    minBalance = Math.min(minBalance, closingBalance);

    // Format date as UTC to avoid timezone shifts
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    days.push({
      date: dateString,
      events: dayEvents,
      openingBalance: Math.round(openingBalance * 100) / 100,
      netChange: Math.round(netChange * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      belowSafeMin,
    });

    currentBalance = closingBalance;
  }

  return {
    accountId,
    year,
    month,
    startingBalance: openingBalanceForMonth,
    isStartMonth,
    safeMinBalance: account.safeMinBalance,
    days,
    overallStatus: {
      minBalance: Math.round(minBalance * 100) / 100,
      daysBelowSafeMin,
    },
  };
}
