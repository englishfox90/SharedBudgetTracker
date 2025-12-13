import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.incomeRule.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create a demo user
  const hashedPassword = await hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  console.log('✓ Created user:', demoUser.email);

  // Create shared checking account
  const sharedAccount = await prisma.account.create({
    data: {
      userId: demoUser.id,
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
  const personAIncome = await prisma.incomeRule.create({
    data: {
      accountId: sharedAccount.id,
      name: 'Person A Salary',
      annualSalary: 65000, // $5.4k/month
      contributionAmount: 680, // Will be recalculated
      payFrequency: 'semi_monthly',
      payDays: JSON.stringify([1, 15]),
    },
  });

  const personBIncome = await prisma.incomeRule.create({
    data: {
      accountId: sharedAccount.id,
      name: 'Person B Salary',
      annualSalary: 58000, // $4.8k/month
      contributionAmount: 605, // Will be recalculated
      payFrequency: 'semi_monthly',
      payDays: JSON.stringify([1, 15]),
    },
  });

  console.log('✓ Created income rules:', personAIncome.name, personBIncome.name);

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
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 10), description: 'Credit Card Payment', amount: -765, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 1), description: 'Person A Contribution', amount: 680, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 3, 15), description: 'Person B Contribution', amount: 605, category: 'income' },
    
    // 2 months ago
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 10), description: 'Credit Card Payment', amount: -825, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 1), description: 'Person A Contribution', amount: 680, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 2, 15), description: 'Person B Contribution', amount: 605, category: 'income' },
    
    // 1 month ago
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 10), description: 'Credit Card Payment', amount: -710, category: 'credit_card_payment' },
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 1), description: 'Person A Contribution', amount: 680, category: 'income' },
    { date: new Date(now.getFullYear(), now.getMonth() - 1, 15), description: 'Person B Contribution', amount: 605, category: 'income' },
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
