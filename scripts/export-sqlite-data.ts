/**
 * Export SQLite data to JSON for migration to PostgreSQL
 * Run: npx tsx scripts/export-sqlite-data.ts
 * 
 * NOTE: This script requires Prisma to be configured for SQLite.
 * If you get a connection error, the Prisma client may have been generated for PostgreSQL.
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Force SQLite connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db', // Relative path from project root
    },
  },
});

async function exportData() {
  console.log('📦 Exporting data from SQLite...\n');

  try {
    // Fetch all data
    const accounts = await prisma.account.findMany();
    const incomeRules = await prisma.incomeRule.findMany();
    const recurringExpenses = await prisma.recurringExpense.findMany();
    const transactions = await prisma.transaction.findMany();
    const dailySpendingAverages = await prisma.dailySpendingAverage.findMany();

    const data = {
      accounts,
      incomeRules,
      recurringExpenses,
      transactions,
      dailySpendingAverages,
      exportedAt: new Date().toISOString(),
    };

    // Write to JSON file
    const exportPath = join(process.cwd(), 'prisma', 'sqlite-export.json');
    writeFileSync(exportPath, JSON.stringify(data, null, 2));

    console.log('✅ Export complete!');
    console.log('\nData exported:');
    console.log(`  - Accounts: ${accounts.length}`);
    console.log(`  - Income Rules: ${incomeRules.length}`);
    console.log(`  - Recurring Expenses: ${recurringExpenses.length}`);
    console.log(`  - Transactions: ${transactions.length}`);
    console.log(`  - Daily Spending Averages: ${dailySpendingAverages.length}`);
    console.log(`\n📁 Saved to: ${exportPath}`);
    console.log('\n⚠️  Keep your dev.db file as backup until migration is confirmed!\n');
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
