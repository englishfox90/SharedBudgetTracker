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
import { useAccount } from '@/contexts/AccountContext';
import { formatDateUTC } from '@/lib/date-utils';
import { formatMoney } from '@/lib/actualize';
import type { ContributionSplitLine, ContributionSplitSummary } from '@/lib/contribution-capacity';

type NumericField = 'startingBalance' | 'safeMinBalance' | 'inflationRate';

export default function SetupTab() {
  const { account, loading: accountLoading, setAccount } = useAccount();
  const [incomeRules, setIncomeRules] = useState<IncomeRule[]>([]);
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The contribution split gets its own dialog: an unfundable split is a real
  // finding, not a failure, and does not belong under "Something went wrong".
  const [contributionResult, setContributionResult] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || 'Could not calculate contributions. Please try again.');
        return;
      }

      const result = await res.json();
      await loadRules(account.id);

      const allocation: ContributionSplitSummary | undefined = result.allocation;
      const lines = (allocation?.contributors ?? []).map(
        (c: ContributionSplitLine) =>
          `${c.name}: ${formatMoney(c.allocatedPerPaycheck)} a paycheck (${Math.round(c.shareOfNet * 100)}% of take-home)` +
          (c.cappedByCeiling ? ' — capped at their ceiling' : '')
      );

      // An infeasible split is the thing worth saying out loud: the expenses
      // are larger than the paychecks can cover, and no contribution setting
      // fixes that.
      if (allocation && !allocation.feasible) {
        setContributionResult({
          title: 'Shared expenses outrun the paychecks',
          type: 'error',
          message: [
            `Shared expenses need ${formatMoney(allocation.cashNeedAnnual / 12)} a month, but everyone's ceilings together only reach ${formatMoney(allocation.totalCapacityAnnual / 12)}.`,
            '',
            ...lines,
            '',
            `That leaves ${formatMoney(allocation.shortfallMonthly)} a month with no paycheck behind it. Contributions were set to the maximum each check can carry — the rest has to come out of expenses, or from raising a contribution ceiling.`,
          ].join('\n'),
        });
        return;
      }

      setContributionResult({
        title: 'Contributions updated',
        type: 'success',
        message: [
          'Contributions updated from the 6-month expense forecast, split by take-home pay.',
          '',
          ...lines,
          ...((allocation?.totalSharedBenefitAnnual ?? 0) > 0
            ? [
                '',
                `${formatMoney((allocation?.totalSharedBenefitAnnual ?? 0) / 12)} a month of shared benefits paid straight from paychecks was counted toward the split.`,
              ]
            : []),
        ].join('\n'),
      });
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
    <div className="stack" style={{ gap: '1.25rem' }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title">Setup</h2>
          <p>Account, income sources and recurring expenses that drive the forecast.</p>
        </div>
      </div>

      {/* Account Settings */}
      <section className="card">
        <div className="section-head">
          <div>
            <h3 className="section-title">Account</h3>
            <p>Changes save when you leave a field.</p>
          </div>
        </div>
        <div className="settings-grid" style={{ marginBottom: '1rem' }}>
          <div>
            <Label.Root htmlFor="account-startingBalance" className="label">{numericFields[0].label}</Label.Root>
            <input
              id="account-startingBalance"
              type="text"
              inputMode="decimal"
              value={drafts.startingBalance}
              onChange={(e) => setDrafts((d) => ({ ...d, startingBalance: e.target.value }))}
              onBlur={() => commitNumericField('startingBalance')}
              onKeyDown={blurOnEnter}
              className="input"
            />
            {savingField === 'startingBalance' && <SavingHint />}
          </div>
          <div>
            <Label.Root htmlFor="account-startDate" className="label">Start Date</Label.Root>
            <input
              id="account-startDate"
              type="date"
              value={startDateDraft}
              onChange={(e) => setStartDateDraft(e.target.value)}
              onBlur={commitStartDate}
              className="input"
            />
            {savingField === 'startDate' && <SavingHint />}
          </div>
          {numericFields.slice(1).map((field) => (
            <div key={field.key}>
              <Label.Root htmlFor={`account-${field.key}`} className="label">{field.label}</Label.Root>
              <input
                id={`account-${field.key}`}
                type="text"
                inputMode="decimal"
                value={drafts[field.key]}
                onChange={(e) => setDrafts((d) => ({ ...d, [field.key]: e.target.value }))}
                onBlur={() => commitNumericField(field.key)}
                onKeyDown={blurOnEnter}
                className="input"
              />
              {savingField === field.key && <SavingHint />}
            </div>
          ))}
        </div>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-secondary)' }}>
          <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', flex: '1 1 240px' }}>
            Recalculate each person&apos;s contribution from the forecasted expenses.
          </p>
          <button onClick={handleCalculateContributions} className="btn btn-secondary btn-sm">
            Calculate contributions
          </button>
        </div>
      </section>

      {/* Income Sources */}
      <section className="card">
        <div className="section-head">
          <div>
            <h3 className="section-title">Income sources</h3>
            <p>Who pays in, how often, and how much per paycheck.</p>
          </div>
          <AddIncomeDialog accountId={account.id} onAdded={loadData} />
        </div>
        <HouseholdCapacitySummary rules={incomeRules} />
        <div className="list">
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
            <p style={{ color: 'var(--text-secondary)' }}>No income sources yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Recurring Expenses */}
      <section className="card">
        <div className="section-head">
          <div>
            <h3 className="section-title">Recurring expenses</h3>
            <p>Bills the forecast expects every cycle. Variable ones are estimated from history.</p>
          </div>
          <AddExpenseDialog accountId={account.id} onAdded={loadData} />
        </div>
        <div className="list">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} onUpdate={loadData} onDelete={loadData} />
          ))}
          {expenses.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No recurring expenses yet. Add one to get started.</p>
          )}
        </div>
      </section>

      {/* Import Transactions */}
      <section className="card">
        <div className="section-head">
          <div>
            <h3 className="section-title">Import history</h3>
            <p>CSV columns: date, amount, description, category. More history makes variable estimates better.</p>
          </div>
        </div>
        <ImportCSV accountId={account.id} onImported={loadData} />
      </section>

      <MessageDialog
        open={!!contributionResult}
        onOpenChange={(open) => !open && setContributionResult(null)}
        title={contributionResult?.title || ''}
        message={contributionResult?.message || ''}
        type={contributionResult?.type || 'success'}
      />
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

/**
 * The household's combined take-home pay, what is already committed, and how
 * much room is left. Without this the Setup tab shows contributions with
 * nothing to judge them against.
 */
function HouseholdCapacitySummary({ rules }: { rules: IncomeRule[] }) {
  const withCapacity = rules.filter((r) => r.capacity);
  if (withCapacity.length === 0) return null;

  const totals = withCapacity.reduce(
    (acc, rule) => {
      const c = rule.capacity!;
      return {
        net: acc.net + c.netPerPaycheck * c.payPeriodsPerYear,
        ceiling: acc.ceiling + c.capacityPerPaycheck * c.payPeriodsPerYear,
        committed: acc.committed + c.currentPerPaycheck * c.payPeriodsPerYear,
        shared: acc.shared + c.sharedBenefitPerPaycheck * c.payPeriodsPerYear,
      };
    },
    { net: 0, ceiling: 0, committed: 0, shared: 0 }
  );

  const headroom = totals.ceiling - totals.committed;
  const overCommitted = headroom < 0;
  const usedOfNet = totals.net > 0 ? totals.committed / totals.net : 0;

  return (
    <div className="grid-3" style={{ marginBottom: '1rem' }}>
      <div className="stat-tile">
        <div className="stat-tile__label">Combined take-home</div>
        <div className="stat-tile__value">{formatMoney(totals.net / 12)}</div>
        <div className="stat-tile__sub">a month, after taxes and deductions</div>
      </div>
      <div className="stat-tile">
        <div className="stat-tile__label">Committed</div>
        <div className="stat-tile__value">{formatMoney(totals.committed / 12)}</div>
        <div className="stat-tile__sub">{Math.round(usedOfNet * 100)}% of take-home</div>
      </div>
      <div className={`stat-tile${overCommitted ? '' : ' stat-tile--accent'}`}>
        <div className="stat-tile__label">{overCommitted ? 'Over the ceiling by' : 'Room left'}</div>
        <div className={`stat-tile__value${overCommitted ? ' money-neg' : ''}`}>
          {formatMoney(Math.abs(headroom) / 12)}
        </div>
        <div className="stat-tile__sub">
          a month{totals.shared > 0 ? ` · ${formatMoney(totals.shared / 12)} of shared benefits paid from paychecks` : ''}
        </div>
      </div>
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

