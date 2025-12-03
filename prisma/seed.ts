import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.incomeRule.deleteMany();
  await prisma.account.deleteMany();

  // Create shared checking account
  const sharedAccount = await prisma.account.create({
    data: {
      name: 'Shared Checking',
      type: 'checking',
      startingBalance: 2500,
      safeMinBalance: 500,
      defaultPayFrequency: 'semi_monthly',
      inflationRate: 3.0,
      autoCalculateContrib: true,
    },
  });

  console.log('✓ Created account:', sharedAccount.name);

  // Create income rules
  const paulIncome = await prisma.incomeRule.create({
    data: {
      accountId: sharedAccount.id,
      name: 'Paul Salary',
      annualSalary: 72000, // $6k/month
      contributionAmount: 750, // Will be recalculated
      payFrequency: 'semi_monthly',
      payDays: JSON.stringify([1, 15]),
    },
  });

  const jamesonIncome = await prisma.incomeRule.create({
    data: {
      accountId: sharedAccount.id,
      name: 'Jameson Salary',
      annualSalary: 66000, // $5.5k/month
      contributionAmount: 687.5, // Will be recalculated
      payFrequency: 'semi_monthly',
      payDays: JSON.stringify([1, 15]),
    },
  });

  console.log('✓ Created income rules:', paulIncome.name, jamesonIncome.name);

  // Create fixed recurring expenses
  const expenses = [
    { name: 'Mortgage', amount: 1500, dayOfMonth: 1, category: 'housing', isVariable: false },
    { name: 'HOA Fee', amount: 200, dayOfMonth: 5, category: 'housing', isVariable: false },
    { name: 'Electric Bill', amount: 120, dayOfMonth: 10, category: 'utilities', isVariable: false },
    { name: 'Internet', amount: 80, dayOfMonth: 15, category: 'utilities', isVariable: false },
    { name: 'Cleaner Service', amount: 150, dayOfMonth: 20, category: 'services', isVariable: false },
    { name: 'Credit Card Payment', amount: 800, dayOfMonth: 10, category: 'credit_card_payment', isVariable: true },
  ];

  for (const expense of expenses) {
    await prisma.recurringExpense.create({
      data: {
        accountId: sharedAccount.id,
        ...expense,
      },
    });
  }

  console.log('✓ Created', expenses.length, 'recurring expenses');

  // Create some historical transactions for variable expense estimation
  const now = new Date();
  const historicalTransactions = [
    // 3 months ago
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 10), description: 'Credit Card Payment', amount: -850, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 1), description: 'Paul Contribution', amount: 750, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 15), description: 'Jameson Contribution', amount: 687.5, category: 'income' },
    
    // 2 months ago
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 10), description: 'Credit Card Payment', amount: -920, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 1), description: 'Paul Contribution', amount: 750, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 15), description: 'Jameson Contribution', amount: 687.5, category: 'income' },
    
    // 1 month ago
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 10), description: 'Credit Card Payment', amount: -780, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 1), description: 'Paul Contribution', amount: 750, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 15), description: 'Jameson Contribution', amount: 687.5, category: 'income' },
  ];

  for (const txn of historicalTransactions) {
    await prisma.transaction.create({
      data: {
        accountId: sharedAccount.id,
        source: 'manual',
        ...txn,
      },
    });
  }

  console.log('✓ Created', historicalTransactions.length, 'historical transactions');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
