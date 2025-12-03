import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLinks() {
  try {
    // Check Citi transactions
    const citiTransactions = await prisma.$queryRaw`
      SELECT id, date, description, amount, recurringExpenseId, category
      FROM transactions 
      WHERE description LIKE '%Citi%'
      ORDER BY date DESC
      LIMIT 5
    `;
    
    console.log('Citi Credit Card transactions:');
    console.log(citiTransactions);
    console.log('');

    // Check what recurring expense IDs exist
    const expenses = await prisma.$queryRaw`
      SELECT id, name, category FROM recurring_expenses
    `;
    
    console.log('Recurring expenses:');
    console.log(expenses);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLinks();
