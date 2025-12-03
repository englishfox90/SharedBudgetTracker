/**
 * Tests for advanced variable expense estimation
 * 
 * Run with: npx tsx scripts/test-variable-expenses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Import the actual implementation (we'll need to export some internals for testing)
import { getVariableExpenseEstimates } from '../lib/variable-expenses-advanced';

async function testBasicEstimation() {
  console.log('\n🧪 Test 1: Basic Estimation with Real Data\n');
  console.log('='.repeat(60));

  try {
    const accountId = 2;
    const targetYear = 2026;
    const targetMonth = 1; // January 2026

    const estimates = await getVariableExpenseEstimates(
      accountId,
      targetYear,
      targetMonth
    );

    console.log(`\nEstimates for ${targetYear}-${String(targetMonth).padStart(2, '0')}:`);
    console.log(JSON.stringify(estimates, null, 2));

    // Get expense names for context
    const expenses = await prisma.recurringExpense.findMany({
      where: { id: { in: Object.keys(estimates).map(Number) } },
    });

    console.log('\nWith names:');
    for (const [id, estimate] of Object.entries(estimates)) {
      const expense = expenses.find((e: any) => e.id === Number(id));
      console.log(`  ${expense?.name}: $${estimate.toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testInflationImpact() {
  console.log('\n🧪 Test 2: Inflation Impact Over Time\n');
  console.log('='.repeat(60));

  try {
    const accountId = 2;
    
    // Test estimates for different future months
    const testMonths = [
      { year: 2025, month: 12 }, // Current
      { year: 2026, month: 6 },  // 6 months ahead
      { year: 2026, month: 12 }, // 12 months ahead
      { year: 2027, month: 12 }, // 24 months ahead
    ];

    for (const { year, month } of testMonths) {
      const estimates = await getVariableExpenseEstimates(accountId, year, month);
      
      console.log(`\n${year}-${String(month).padStart(2, '0')}:`);
      
      // Show first estimate (Citi Credit Card if it exists)
      const citiId = 13;
      if (estimates[citiId]) {
        console.log(`  Citi Credit Card: $${estimates[citiId].toLocaleString()}`);
      }
    }

    console.log('\n📊 As time progresses, estimates should increase slightly due to inflation');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testSeasonalVariation() {
  console.log('\n🧪 Test 3: Seasonal Variation Detection\n');
  console.log('='.repeat(60));

  try {
    const accountId = 2;
    const year = 2026;
    
    // Test all 12 months to see seasonal patterns
    console.log('\nMonthly estimates for 2026:');
    console.log('(Look for patterns - some months might be consistently higher/lower)\n');

    const citiId = 13;
    const results: Array<{ month: number; estimate: number }> = [];

    for (let month = 1; month <= 12; month++) {
      const estimates = await getVariableExpenseEstimates(accountId, year, month);
      
      if (estimates[citiId]) {
        results.push({ month, estimate: estimates[citiId] });
      }
    }

    // Display results
    results.forEach(({ month, estimate }) => {
      const monthName = new Date(2026, month - 1, 1).toLocaleString('default', { month: 'short' });
      const bar = '█'.repeat(Math.floor(estimate / 200));
      console.log(`  ${monthName}: $${estimate.toLocaleString().padStart(8)} ${bar}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testFallbackBehavior() {
  console.log('\n🧪 Test 4: Fallback to Configured Amount\n');
  console.log('='.repeat(60));

  try {
    const accountId = 2;
    
    // Create a new variable expense with no history
    const newExpense = await prisma.recurringExpense.create({
      data: {
        accountId,
        name: 'Test New Expense',
        amount: 500,
        dayOfMonth: 15,
        category: 'other',
        isVariable: true,
      },
    });

    console.log(`\nCreated new expense: ID ${newExpense.id}, configured amount: $${newExpense.amount}`);

    // Try to get estimate
    const estimates = await getVariableExpenseEstimates(accountId, 2026, 1);
    
    console.log(`Estimated amount: $${estimates[newExpense.id]}`);
    console.log(
      estimates[newExpense.id] === newExpense.amount
        ? '✅ Correctly fell back to configured amount'
        : '❌ Did not fall back correctly'
    );

    // Cleanup
    await prisma.recurringExpense.delete({ where: { id: newExpense.id } });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  ADVANCED VARIABLE EXPENSE ESTIMATION TESTS');
  console.log('='.repeat(60));

  await testBasicEstimation();
  await testInflationImpact();
  await testSeasonalVariation();
  await testFallbackBehavior();

  console.log('\n' + '='.repeat(60));
  console.log('  ALL TESTS COMPLETE');
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
