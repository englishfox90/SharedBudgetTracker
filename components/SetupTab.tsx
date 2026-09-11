'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import * as Label from '@radix-ui/react-label';
import { Account, IncomeRule, RecurringExpense } from '@/types';
import { MessageDialog } from './dialogs';
import { IncomeRuleCard } from './setup/IncomeRuleCard';
import { AddIncomeDialog } from './setup/AddIncomeDialog';
import { ExpenseCard } from './setup/ExpenseCard';
import { AddExpenseDialog } from './setup/AddExpenseDialog';
import ImportCSV from './ImportCSV';
import { useAccount } from '@/contexts/AccountContext';
import { formatDateUTC } from '@/lib/date-utils';

type NumericField = 'startingBalance' | 'safeMinBalance' | 'inflationRate';

export default function SetupTab() {
  const { account, loading: accountLoading, setAccount } = useAccount();
  const [incomeRules, setIncomeRules] = useState<IncomeRule[]>([]);
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Local draft values for the account fields. They are only sent to the
  // server when the field loses focus (or Enter is pressed), so typing
  // "2500" no longer saves 2, 25 and 250 along the way.
  const [drafts, setDrafts] = useState<Record<NumericField, string>>({
    startingBalance: '',
    safeMinBalance: '',
    inflationRate: '',
  });
  const [startDateDraft, setStartDateDraft] = useState('');
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setDrafts({
        startingBalance: String(account.startingBalance),
        safeMinBalance: String(account.safeMinBalance),
        inflationRate: String(account.inflationRate),
      });
      setStartDateDraft(account.startDate ? formatDateUTC(account.startDate) : '');
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      loadRules(account.id);
    } else if (!accountLoading) {
      setLoading(false);
    }
  }, [account?.id, accountLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRules(accountId: number) {
    try {
      const [incomeRes, expensesRes] = await Promise.all([
        fetch(`/api/income-rules?accountId=${accountId}`),
        fetch(`/api/expenses?accountId=${accountId}`),
      ]);
      setIncomeRules(await incomeRes.json());
      setExpenses(await expensesRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function loadData() {
    if (account) loadRules(account.id);
  }

  async function updateAccount(updates: Partial<Account>, fieldName: string) {
    if (!account || !account.id) {
      console.error('Cannot update account: account not loaded');
      return;
    }

    setSavingField(fieldName);
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
      setErrorMessage('Could not save the change. Please try again.');
    } finally {
      setSavingField(null);
    }
  }

  function commitNumericField(field: NumericField) {
    if (!account) return;
    const value = parseFloat(drafts[field].replace(/,/g, ''));
    if (isNaN(value)) {
      // Revert an unparseable draft to the saved value
      setDrafts((d) => ({ ...d, [field]: String(account[field]) }));
      return;
    }
    if (value === account[field]) return;
    updateAccount({ [field]: value }, field);
  }

  function commitStartDate() {
    if (!account || !startDateDraft) return;
    const current = account.startDate ? formatDateUTC(account.startDate) : '';
    if (startDateDraft === current) return;
    updateAccount({ startDate: new Date(`${startDateDraft}T00:00:00Z`) }, 'startDate');
  }

  function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  async function handleCalculateContributions() {
    if (!account) return;

    try {
      const res = await fetch(`/api/contributions?accountId=${account.id}`, { method: 'POST' });
      if (res.ok) {
        await loadRules(account.id);
        setSuccessMessage('Contributions updated based on forecasted expenses!');
      } else {
        setErrorMessage('Could not calculate contributions. Please try again.');
      }
    } catch (error) {
      console.error('Error calculating contributions:', error);
      setErrorMessage('Could not calculate contributions. Please try again.');
    }
  }

  if (loading || accountLoading) {
    return <div>Loading...</div>;
  }

  if (!account) {
    return <div>No account found. Please create an account first.</div>;
  }

  const numericFields: Array<{ key: NumericField; label: string; step?: string }> = [
    { key: 'startingBalance', label: 'Starting Balance ($)' },
    { key: 'safeMinBalance', label: 'Safe Minimum Balance ($)' },
    { key: 'inflationRate', label: 'Inflation Rate (%)', step: '0.1' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Account Settings */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Account Settings</h2>
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Changes save when you leave a field.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <Label.Root htmlFor="account-startingBalance" style={labelStyle}>{numericFields[0].label}</Label.Root>
            <input
              id="account-startingBalance"
              type="text"
              inputMode="decimal"
              value={drafts.startingBalance}
              onChange={(e) => setDrafts((d) => ({ ...d, startingBalance: e.target.value }))}
              onBlur={() => commitNumericField('startingBalance')}
              onKeyDown={blurOnEnter}
              style={inputStyle}
            />
            {savingField === 'startingBalance' && <SavingHint />}
          </div>
          <div>
            <Label.Root htmlFor="account-startDate" style={labelStyle}>Start Date</Label.Root>
            <input
              id="account-startDate"
              type="date"
              value={startDateDraft}
              onChange={(e) => setStartDateDraft(e.target.value)}
              onBlur={commitStartDate}
              style={inputStyle}
            />
            {savingField === 'startDate' && <SavingHint />}
          </div>
          {numericFields.slice(1).map((field) => (
            <div key={field.key}>
              <Label.Root htmlFor={`account-${field.key}`} style={labelStyle}>{field.label}</Label.Root>
              <input
                id={`account-${field.key}`}
                type="text"
                inputMode="decimal"
                value={drafts[field.key]}
                onChange={(e) => setDrafts((d) => ({ ...d, [field.key]: e.target.value }))}
                onBlur={() => commitNumericField(field.key)}
                onKeyDown={blurOnEnter}
                style={inputStyle}
              />
              {savingField === field.key && <SavingHint />}
            </div>
          ))}
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
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '0', marginBottom: '1rem' }}>
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
            <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>No income sources yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Recurring Expenses */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '0', marginBottom: '1rem' }}>
          <h2 style={headingStyle}>Recurring Expenses</h2>
          <AddExpenseDialog accountId={account.id} onAdded={loadData} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} onUpdate={loadData} onDelete={loadData} />
          ))}
          {expenses.length === 0 && (
            <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>No recurring expenses yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Import Transactions */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Import Historical Data</h2>
        <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Import CSV transactions to improve variable expense estimates. Format: date, amount, description, category
        </p>
        <ImportCSV accountId={account.id} onImported={loadData} />
      </section>

      <MessageDialog
        open={!!successMessage}
        onOpenChange={(open) => !open && setSuccessMessage(null)}
        title="Success"
        message={successMessage || ''}
        type="success"
      />
      <MessageDialog
        open={!!errorMessage}
        onOpenChange={(open) => !open && setErrorMessage(null)}
        title="Something went wrong"
        message={errorMessage || ''}
        type="error"
      />
    </div>
  );
}

function SavingHint() {
  return (
    <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
      Saving…
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-label)',
  fontWeight: '500',
  marginBottom: '0.25rem',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: 'var(--font-body)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '4px',
  fontSize: 'var(--font-body)',
  fontWeight: '500',
  cursor: 'pointer',
};
