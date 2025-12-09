'use client';

import { useState, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { Account, IncomeRule, RecurringExpense } from '@/types';
import { MessageDialog } from './dialogs';
import { IncomeRuleCard } from './setup/IncomeRuleCard';
import { AddIncomeDialog } from './setup/AddIncomeDialog';
import { ExpenseCard } from './setup/ExpenseCard';
import { AddExpenseDialog } from './setup/AddExpenseDialog';
import ImportCSV from './ImportCSV';

export default function SetupTab() {
  const [account, setAccount] = useState<Account | null>(null);
  const [incomeRules, setIncomeRules] = useState<IncomeRule[]>([]);
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const accountsRes = await fetch('/api/accounts');
      const accounts = await accountsRes.json();
      
      if (accounts.length > 0) {
        const acc = accounts[0];
        setAccount(acc);

        const incomeRes = await fetch(`/api/income-rules?accountId=${acc.id}`);
        const incomeData = await incomeRes.json();
        setIncomeRules(incomeData);

        const expensesRes = await fetch(`/api/expenses?accountId=${acc.id}`);
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateAccount(updates: Partial<Account>) {
    if (!account || !account.id) {
      console.error('Cannot update account: account not loaded');
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to update account: ${res.status}`);
      }
      
      const updated = await res.json();
      setAccount(updated);
    } catch (error) {
      console.error('Error updating account:', error);
    }
  }

  async function handleCalculateContributions() {
    if (!account) return;

    try {
      const res = await fetch(`/api/contributions?accountId=${account.id}`, { method: 'POST' });
      if (res.ok) {
        await loadData();
        setSuccessMessage('Contributions updated based on forecasted expenses!');
      }
    } catch (error) {
      console.error('Error calculating contributions:', error);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!account) {
    return <div>No account found. Please create an account first.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Account Settings */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Account Settings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <Label.Root style={labelStyle}>Starting Balance ($)</Label.Root>
            <input
              type="number"
              value={account.startingBalance}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  updateAccount({ startingBalance: value });
                }
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <Label.Root style={labelStyle}>Start Date</Label.Root>
            <input
              type="date"
              value={account.startDate ? new Date(account.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  updateAccount({ startDate: new Date(e.target.value) });
                }
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <Label.Root style={labelStyle}>Safe Minimum Balance ($)</Label.Root>
            <input
              type="number"
              value={account.safeMinBalance}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  updateAccount({ safeMinBalance: value });
                }
              }}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <Label.Root style={labelStyle}>Inflation Rate (%)</Label.Root>
            <input
              type="number"
              step="0.1"
              value={account.inflationRate}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  updateAccount({ inflationRate: value });
                }
              }}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <Label.Root style={labelStyle}>Auto-Calculate Contributions</Label.Root>
          <button
            onClick={handleCalculateContributions}
            style={buttonStyle}
          >
            Calculate Contributions
          </button>
        </div>
      </section>

      {/* Income Sources */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={headingStyle}>Income Sources</h2>
          <AddIncomeDialog accountId={account.id} onAdded={loadData} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {incomeRules.map((rule) => {
            const totalContribution = incomeRules.reduce((sum, r) => sum + r.contributionAmount, 0);
            return (
              <IncomeRuleCard 
                key={rule.id} 
                rule={rule} 
                totalContribution={totalContribution}
                onUpdate={loadData} 
                onDelete={loadData} 
              />
            );
          })}
          {incomeRules.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: '#666' }}>No income sources yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Recurring Expenses */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={headingStyle}>Recurring Expenses</h2>
          <AddExpenseDialog accountId={account.id} onAdded={loadData} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} onUpdate={loadData} onDelete={loadData} />
          ))}
          {expenses.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: '#666' }}>No recurring expenses yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Import Transactions */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Import Historical Data</h2>
        <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
          Import CSV transactions to improve variable expense estimates. Format: date, amount, description, category
        </p>
        <ImportCSV accountId={account.id} onImported={loadData} />
      </section>

      {/* Success Dialog */}
      <MessageDialog
        open={!!successMessage}
        onOpenChange={(open) => !open && setSuccessMessage(null)}
        title="Success"
        message={successMessage || ''}
        type="success"
      />
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};
