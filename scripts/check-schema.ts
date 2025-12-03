import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Check one transaction to see its structure
    const transaction = await prisma.$queryRaw`
      SELECT * FROM transactions LIMIT 1
    `;
    
    console.log('Transaction table structure:');
    console.log(transaction);

    // Get column info
    const columns = await prisma.$queryRaw`
      PRAGMA table_info(transactions)
    `;
    
    console.log('\nColumns in transactions table:');
    console.log(columns);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
