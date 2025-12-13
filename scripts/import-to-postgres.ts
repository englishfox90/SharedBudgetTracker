/**
 * Import data from SQLite export into PostgreSQL
 * Run: npx tsx scripts/import-to-postgres.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface ExportData {
  accounts: any[];
  incomeRules: any[];
  recurringExpenses: any[];
  transactions: any[];
  dailySpendingAverages: any[];
  exportedAt: string;
}

async function importData() {
  console.log('📥 Importing data to PostgreSQL...\n');

  try {
    // Read exported JSON
    const exportPath = join(process.cwd(), 'prisma', 'sqlite-export.json');
    const fileContent = readFileSync(exportPath, 'utf-8');
    const data: ExportData = JSON.parse(fileContent);

    console.log(`📅 Data exported at: ${data.exportedAt}\n`);

    // Import in correct order (respecting foreign keys)
    console.log('1️⃣  Importing accounts...');
    for (const account of data.accounts) {
      await prisma.account.create({
        data: {
          id: account.id,
          userId: account.userId || 1, // Link to default user if not present
          name: account.name,
          type: account.type,
          startingBalance: account.startingBalance,
          startDate: new Date(account.startDate),
          safeMinBalance: account.safeMinBalance,
          defaultPayFrequency: account.defaultPayFrequency,
          inflationRate: account.inflationRate,
          autoCalculateContrib: account.autoCalculateContrib,
          createdAt: new Date(account.createdAt),
          updatedAt: new Date(account.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${data.accounts.length} accounts\n`);

    console.log('2️⃣  Importing income rules...');
    for (const rule of data.incomeRules) {
      await prisma.incomeRule.create({
        data: {
          id: rule.id,
          accountId: rule.accountId,
          name: rule.name,
          annualSalary: rule.annualSalary,
          contributionAmount: rule.contributionAmount,
          payFrequency: rule.payFrequency,
          payDays: rule.payDays,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${data.incomeRules.length} income rules\n`);

    console.log('3️⃣  Importing recurring expenses...');
    for (const expense of data.recurringExpenses) {
      await prisma.recurringExpense.create({
        data: {
          id: expense.id,
          accountId: expense.accountId,
          name: expense.name,
          amount: expense.amount,
          dayOfMonth: expense.dayOfMonth,
          category: expense.category,
          frequency: expense.frequency,
          isVariable: expense.isVariable,
          activeFrom: expense.activeFrom ? new Date(expense.activeFrom) : null,
          activeTo: expense.activeTo ? new Date(expense.activeTo) : null,
          createdAt: new Date(expense.createdAt),
          updatedAt: new Date(expense.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${data.recurringExpenses.length} recurring expenses\n`);

    console.log('4️⃣  Importing transactions...');
    for (const transaction of data.transactions) {
      await prisma.transaction.create({
        data: {
          id: transaction.id,
          accountId: transaction.accountId,
          date: new Date(transaction.date),
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          source: transaction.source,
          incomeRuleId: transaction.incomeRuleId,
          recurringExpenseId: transaction.recurringExpenseId,
          createdAt: new Date(transaction.createdAt),
          updatedAt: new Date(transaction.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${data.transactions.length} transactions\n`);

    console.log('5️⃣  Importing daily spending averages...');
    for (const avg of data.dailySpendingAverages) {
      await prisma.dailySpendingAverage.create({
        data: {
          id: avg.id,
          recurringExpenseId: avg.recurringExpenseId,
          month: avg.month,
          day: avg.day,
          sumOfSpending: avg.sumOfSpending,
          transactionCount: avg.transactionCount,
          dailyAverage: avg.dailyAverage,
          createdAt: new Date(avg.createdAt),
          updatedAt: new Date(avg.updatedAt),
        },
      });
    }
    console.log(`✅ Imported ${data.dailySpendingAverages.length} daily spending averages\n`);

    // Reset sequences to max ID + 1 (PostgreSQL specific)
    console.log('6️⃣  Resetting ID sequences...');
    const maxAccountId = Math.max(...data.accounts.map(a => a.id), 0);
    const maxIncomeRuleId = Math.max(...data.incomeRules.map(r => r.id), 0);
    const maxRecurringExpenseId = Math.max(...data.recurringExpenses.map(e => e.id), 0);
    const maxTransactionId = Math.max(...data.transactions.map(t => t.id), 0);
    const maxDailySpendingId = Math.max(...data.dailySpendingAverages.map(a => a.id), 0);

    await prisma.$executeRawUnsafe(`SELECT setval('accounts_id_seq', ${maxAccountId + 1}, false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('income_rules_id_seq', ${maxIncomeRuleId + 1}, false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('recurring_expenses_id_seq', ${maxRecurringExpenseId + 1}, false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('transactions_id_seq', ${maxTransactionId + 1}, false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('daily_spending_averages_id_seq', ${maxDailySpendingId + 1}, false);`);
    console.log('✅ Sequences reset\n');

    console.log('🎉 Migration complete! Your data is now in PostgreSQL.\n');
    console.log('Next steps:');
    console.log('  1. Test the app: npm run dev');
    console.log('  2. Verify all data looks correct');
    console.log('  3. Keep dev.db as backup for a few days');
    console.log('  4. Deploy to Railway when ready!\n');
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.log('\n⚠️  Your SQLite data is safe. You can retry the import after fixing the issue.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
