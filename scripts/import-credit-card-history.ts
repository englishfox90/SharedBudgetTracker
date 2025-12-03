import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Import historical credit card transactions from CSV
 * 
 * CSV Format:
 * date,description,amount
 * 2023-12-01,Amazon Purchase,-125.50
 * 2023-12-15,Grocery Store,-87.23
 * 
 * Usage:
 * 1. Save your CSV file as 'credit-card-history.csv' in the scripts folder
 * 2. Update the ACCOUNT_ID and RECURRING_EXPENSE_ID constants below
 * 3. Run: npx tsx scripts/import-credit-card-history.ts
 */

// ============ CONFIGURATION ============
const ACCOUNT_ID = 2; // Your account ID
const CSV_FILE = 'credit-card-history.csv';

// Map expense names to their recurring expense IDs
// You can find these IDs in your database or Setup tab
const EXPENSE_NAME_TO_ID: Record<string, number> = {
  'Citi Credit Card': 13,           // Update with your actual ID
  'Apple Credit Card': 19,          // Update with your actual ID
  'Credit Card Payment': 13,        // Alias for category column
};

// Optional: Auto-categorize based on description keywords
const DESCRIPTION_PATTERNS: Record<string, string> = {
  'citi credit card': 'Citi Credit Card',
  'apple credit card': 'Apple Credit Card',
  'amazon': 'Citi Credit Card',
  'apple': 'Apple Credit Card',
  'grocery': 'Citi Credit Card',
  // Add more patterns as needed
};
// ========================================

interface CSVRow {
  date: string;
  description: string;
  amount: string;
  category?: string; // Optional column to specify which credit card
}

async function importCreditCardHistory() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, CSV_FILE);
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      console.log('\n📝 Create a CSV file with this format:');
      console.log('date,description,amount,category');
      console.log('2023-12-01,Amazon Purchase,-125.50,Citi Credit Card');
      console.log('2023-12-15,Apple Store,-87.23,Apple Credit Card');
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.error('❌ CSV file is empty');
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIndex = headers.indexOf('date');
    const descIndex = headers.indexOf('description');
    const amountIndex = headers.indexOf('amount');
    const categoryIndex = headers.indexOf('category');

    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      console.error('❌ CSV must have columns: date, description, amount');
      return;
    }

    // Parse rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < 3) continue;

      rows.push({
        date: values[dateIndex],
        description: values[descIndex],
        amount: values[amountIndex],
        category: categoryIndex !== -1 ? values[categoryIndex] : undefined,
      });
    }

    console.log(`📊 Found ${rows.length} transactions to import\n`);

    // Import transactions
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // Determine which credit card this belongs to
        let recurringExpenseId: number | null = null;
        
        // First, try category column
        if (row.category) {
          recurringExpenseId = EXPENSE_NAME_TO_ID[row.category] || null;
        }
        
        // If not found, try description column
        if (!recurringExpenseId) {
          recurringExpenseId = EXPENSE_NAME_TO_ID[row.description] || null;
        }
        
        // If still not found, try pattern matching on description
        if (!recurringExpenseId) {
          const desc = row.description.toLowerCase();
          for (const [pattern, expenseName] of Object.entries(DESCRIPTION_PATTERNS)) {
            if (desc.includes(pattern)) {
              recurringExpenseId = EXPENSE_NAME_TO_ID[expenseName] || null;
              break;
            }
          }
        }

        if (!recurringExpenseId) {
          console.log(`⚠️  Skipped (no matching expense): ${row.date} - ${row.description}`);
          skipped++;
          continue;
        }

        // Check if transaction already exists
        const existing = await prisma.transaction.findFirst({
          where: {
            accountId: ACCOUNT_ID,
            date: new Date(row.date),
            description: row.description,
            amount: parseFloat(row.amount),
          },
        });

        if (existing) {
          console.log(`⏭️  Already exists: ${row.date} - ${row.description}`);
          skipped++;
          continue;
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            accountId: ACCOUNT_ID,
            date: new Date(row.date),
            description: row.description,
            amount: parseFloat(row.amount),
            recurringExpenseId,
          },
        });

        console.log(`✅ Imported: ${row.date} - ${row.description} (${row.amount})`);
        imported++;

      } catch (error) {
        console.error(`❌ Error importing: ${row.date} - ${row.description}`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCreditCardHistory();
