import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Link imported transactions to their recurring expenses
 * Run after importing historical data to establish the foreign key relationships
 */

async function linkTransactionsToExpenses() {
  try {
    console.log('🔗 Linking imported transactions to recurring expenses...\n');

    // Get all recurring expenses
    const expenses = await prisma.recurringExpense.findMany();
    
    console.log('📋 Found recurring expenses:');
    expenses.forEach(exp => {
      console.log(`  - ID ${exp.id}: ${exp.name} (${exp.category})`);
    });
    console.log('');

    // Link Citi Credit Card transactions
    const citiExpense = expenses.find(e => e.name === 'Citi Credit Card');
    if (citiExpense) {
      const result = await prisma.$executeRaw`
        UPDATE transactions 
        SET recurringExpenseId = ${citiExpense.id},
            category = ${citiExpense.category}
        WHERE description = 'Citi Credit Card'
      `;
      console.log(`✅ Updated ${result} Citi Credit Card transactions`);
    }

    // Link Apple Credit Card transactions
    const appleExpense = expenses.find(e => e.name === 'Apple Credit Card');
    if (appleExpense) {
      const result = await prisma.$executeRaw`
        UPDATE transactions 
        SET recurringExpenseId = ${appleExpense.id},
            category = ${appleExpense.category}
        WHERE description = 'Apple Credit Card'
      `;
      console.log(`✅ Updated ${result} Apple Credit Card transactions`);
    }

    console.log('\n✨ Done! Refresh your browser to see the updated categories.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkTransactionsToExpenses();
