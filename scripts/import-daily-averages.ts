import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importDailyAverages() {
  try {
    console.log('📊 Importing daily spending averages...\n');

    // Read the TSV file
    const tsvPath = path.join(__dirname, 'daily_spending.tsv');
    const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
    const lines = tsvContent.split(/\r?\n/); // Handle both Unix and Windows line endings

    console.log(`Total lines in file: ${lines.length}`);

    // Skip header row
    const dataLines = lines.slice(1).filter(line => line.trim());

    console.log(`Found ${dataLines.length} rows of data\n`);

    // Find the Citi Credit Card expense
    const citiExpense = await prisma.recurringExpense.findFirst({
      where: { name: 'Citi Credit Card' },
    });

    if (!citiExpense) {
      console.error('❌ Citi Credit Card expense not found in database');
      return;
    }

    console.log(`✅ Found Citi Credit Card expense (ID: ${citiExpense.id})\n`);

    let imported = 0;
    let skipped = 0;

    for (const line of dataLines) {
      const parts = line.split('\t');
      if (parts.length < 4) {
        skipped++;
        continue;
      }

      const [monthDay, sumOfDebt, countOfDebt, dailyAverage] = parts;
      
      // Parse month-day (format: MM-DD)
      const [month, day] = monthDay.split('-').map(Number);
      
      if (!month || !day) {
        skipped++;
        continue;
      }

      const sum = parseFloat(sumOfDebt) || 0;
      const count = parseInt(countOfDebt) || 0;
      const average = parseFloat(dailyAverage) || 0;

      // Store in database
      await prisma.$executeRaw`
        INSERT OR REPLACE INTO daily_spending_averages 
        (recurringExpenseId, month, day, sumOfSpending, transactionCount, dailyAverage, createdAt, updatedAt)
        VALUES (
          ${citiExpense.id},
          ${month},
          ${day},
          ${sum},
          ${count},
          ${average},
          datetime('now'),
          datetime('now')
        )
      `;

      imported++;

      if (imported % 50 === 0) {
        console.log(`  Imported ${imported} rows...`);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`  - Imported: ${imported} rows`);
    console.log(`  - Skipped: ${skipped} rows`);

    // Show some sample data
    const samples = await prisma.$queryRaw<any[]>`
      SELECT month, day, dailyAverage
      FROM daily_spending_averages
      WHERE recurringExpenseId = ${citiExpense.id}
      ORDER BY dailyAverage DESC
      LIMIT 10
    `;

    console.log(`\n📈 Top 10 highest daily averages:`);
    samples.forEach((s: any) => {
      console.log(`  ${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}: $${s.dailyAverage.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importDailyAverages();
