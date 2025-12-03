import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const accountId = formData.get('accountId') as string;

    if (!file || !accountId) {
      return NextResponse.json(
        { error: 'File and accountId are required' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: results.errors },
        { status: 400 }
      );
    }

    const transactions = [];
    for (const row of results.data as any[]) {
      const { date, amount, description, category } = row;

      if (!date || !amount) {
        continue; // Skip invalid rows
      }

      transactions.push({
        accountId: parseInt(accountId),
        date: new Date(date),
        amount: parseFloat(amount),
        description: description || '',
        category: category || null,
        source: 'import',
      });
    }

    // Bulk create transactions
    const created = await prisma.transaction.createMany({
      data: transactions,
    });

    return NextResponse.json({
      success: true,
      imported: created.count,
      total: transactions.length,
    });
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}
