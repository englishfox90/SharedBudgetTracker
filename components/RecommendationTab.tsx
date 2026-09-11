'use client';

import { IconLabel, InfoIcon, ZapIcon, CheckIcon, LightbulbIcon, AlertTriangleIcon } from './icons';
import { formatMoney } from '@/lib/actualize';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import SixMonthOverview from './recommendations/SixMonthOverview';
import VarianceSummary from './recommendations/VarianceSummary';
import TrendChart from './recommendations/TrendChart';
import SuggestionCards from './recommendations/SuggestionCards';
import ComparisonChart from './recommendations/ComparisonChart';
import { RecommendationOverview } from '@/lib/recommendation-engine';
import { useAccount } from '@/contexts/AccountContext';
import { MessageDialog } from './dialogs';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

export default function RecommendationTab({ currentMonth }: Props) {
  const [data, setData] = useState<RecommendationOverview | null>(null);
  const { account, loading: accountLoading } = useAccount();
  const accountId = account?.id ?? null;
  const [message, setMessage] = useState<{ title: string; text: string; type: 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [implementSuccess, setImplementSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [incomeRules, setIncomeRules] = useState<any[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (accountId) {
      loadRecommendations();
    }
  }, [currentMonth, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRecommendations() {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recommendations?accountId=${accountId}&year=${currentMonth.year}&month=${currentMonth.month}`
      );
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function showImplementationModal() {
    if (!accountId || !data?.contributionAnalysis.recommendedAnnualContribution) return;
    
    try {
      // Load income rules to show in modal
      const rulesRes = await fetch(`/api/income-rules?accountId=${accountId}`);
      const rules = await rulesRes.json();
      
      if (rules.length === 0) {
        setMessage({ title: 'No income sources', text: 'Set up income sources in the Setup tab first.', type: 'info' });
        return;
      }

      const currentTotal = data.contributionAnalysis.currentAnnualContribution;
      if (!currentTotal || currentTotal <= 0) {
        setMessage({
          title: 'No current contributions',
          text: 'Contributions are currently zero, so they cannot be scaled up proportionally. Set a contribution amount on each income source in the Setup tab (or use Calculate Contributions) and try again.',
          type: 'info',
        });
        return;
      }
      
      setIncomeRules(rules);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error loading income rules:', error);
      setMessage({ title: 'Something went wrong', text: 'Could not load income sources.', type: 'error' });
    }
  }

  async function confirmImplementation() {
    if (!accountId || !data?.contributionAnalysis.recommendedAnnualContribution) return;
    
    setShowConfirmModal(false);
    setImplementing(true);
    setImplementSuccess(false);
    
    try {
      // Calculate adjustment ratio
      const currentTotal = data.contributionAnalysis.currentAnnualContribution;
      const recommendedTotal = data.contributionAnalysis.recommendedAnnualContribution;
      if (!currentTotal || currentTotal <= 0) return; // guarded in showImplementationModal
      const adjustmentRatio = recommendedTotal / currentTotal;
      
      // Update each income rule proportionally
      const updatePromises = incomeRules.map((rule: any) => {
        const newContribution = rule.contributionAmount * adjustmentRatio;
        return fetch(`/api/income-rules/${rule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contributionAmount: Math.round(newContribution * 100) / 100,
          }),
        });
      });
      
      await Promise.all(updatePromises);
      
      setImplementSuccess(true);
      
      // Reload recommendations immediately to show updated values
      await loadRecommendations();
      
      // Reset success message after showing it briefly
      setTimeout(() => {
        setImplementSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error implementing recommendation:', error);
      setMessage({ title: 'Something went wrong', text: 'Could not update income sources. Please try manually in the Setup tab.', type: 'error' });
    } finally {
      setImplementing(false);
    }
  }

  if ((loading || accountLoading) && !data) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: '36px', width: '50%' }} />
        <div className="skeleton" style={{ height: '140px' }} />
        <div className="skeleton" style={{ height: '320px' }} />
        <div className="skeleton" style={{ height: '260px' }} />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        No account found. Please set up your account in the Setup tab first.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        No recommendation data available. Please set up income and expenses in the Setup tab.
      </div>
    );
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1))
    .toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const analysis = data.contributionAnalysis;
  const recommended = analysis.recommendedAnnualContribution ?? analysis.currentAnnualContribution;
  const annualIncrease = recommended - analysis.currentAnnualContribution;

  return (
    <div className="stack" style={{ gap: '1.25rem', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', opacity: 0.6, zIndex: 10, borderRadius: 'var(--radius)' }} />
      )}

      {/* Header */}
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title" style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>Insights</h2>
          <p>6-month outlook from {monthName}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow}>
          <InfoIcon size={16} /> How this works
        </button>
      </div>

      {showHow && (
        <div className="alert alert--info">
          <InfoIcon size={18} />
          <div>
            The next six months of income and expenses are projected from your Setup. Variable expenses use your
            history, spending trends are compared against three- and six-month averages, and suggestions are
            raised when your balance is heading towards the safe minimum.
          </div>
        </div>
      )}

      {/* Action required */}
      {analysis.adjustmentNeeded && (
        <div className="card" style={{ borderColor: 'var(--warning-border)', borderWidth: 1 }}>
          <div className="section-head">
            <div>
              <h3 className="section-title">
                <IconLabel icon={<ZapIcon size={18} style={{ color: 'var(--color-warning)' }} />}>Action required</IconLabel>
              </h3>
              <p>Increase contributions by {Math.round(analysis.adjustmentPercentage)}% to stay above your safe minimum.</p>
            </div>
            <span className="pill pill--warning"><AlertTriangleIcon size={11} /> Shortfall ahead</span>
          </div>

          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="stat-tile">
              <div className="stat-tile__label">Current per year</div>
              <div className="stat-tile__value">{formatMoney(analysis.currentAnnualContribution)}</div>
            </div>
            <div className="stat-tile stat-tile--accent">
              <div className="stat-tile__label">Recommended per year</div>
              <div className="stat-tile__value">{formatMoney(recommended)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__label">Extra per month</div>
              <div className="stat-tile__value">{formatMoney(annualIncrease / 12)}</div>
              <div className="stat-tile__sub">{formatMoney(annualIncrease, true)} per year</div>
            </div>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', flex: '1 1 260px' }}>
              Applies the increase proportionally across every income source in Setup. You can review the split before it is saved.
            </p>
            <button
              onClick={showImplementationModal}
              disabled={implementing || implementSuccess}
              className={`btn ${implementSuccess ? 'btn-success' : 'btn-primary'}`}
            >
              {implementSuccess ? (
                <><CheckIcon size={16} /> Applied</>
              ) : implementing ? (
                'Updating…'
              ) : (
                <><ZapIcon size={16} /> Apply recommendation</>
              )}
            </button>
          </div>

          <ComparisonChart
            currentAnnual={analysis.currentAnnualContribution}
            recommendedAnnual={recommended}
            months={data.sixMonthForecast.months}
          />
        </div>
      )}

      <SuggestionCards suggestions={data.suggestions} />

      <SixMonthOverview 
        months={data.sixMonthForecast.months} 
        safeMinBalance={data.sixMonthForecast.safeMinBalance}
      />

      <VarianceSummary months={data.sixMonthForecast.months} />

      <TrendChart trends={data.trendAnalysis.expenses} />

      <MessageDialog
        open={!!message}
        onOpenChange={(open) => !open && setMessage(null)}
        title={message?.title || ''}
        message={message?.text || ''}
        type={message?.type || 'info'}
      />

      {/* Confirmation modal */}
      {showConfirmModal && data && (
        <>
          <div className="dialog-overlay" onClick={() => setShowConfirmModal(false)} />
          <div className="dialog-content dialog-content--wide" role="dialog" aria-modal="true" aria-labelledby="confirm-contribution-title">
            <h3 id="confirm-contribution-title" className="dialog-title">Confirm contribution increase</h3>
            <p className="dialog-description">Each income source is scaled by the same percentage.</p>

            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="stat-tile stat-tile--accent">
                <div className="stat-tile__label">Total increase per year</div>
                <div className="stat-tile__value">{formatMoney(annualIncrease, true)}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">About per month</div>
                <div className="stat-tile__value">{formatMoney(annualIncrease / 12, true)}</div>
              </div>
            </div>

            <div className="list" style={{ marginBottom: '1rem' }}>
              {incomeRules.map((rule: any) => {
                const currentTotal = analysis.currentAnnualContribution;
                const adjustmentRatio = currentTotal > 0 ? recommended / currentTotal : 1;
                const newContribution = rule.contributionAmount * adjustmentRatio;
                const increase = newContribution - rule.contributionAmount;
                const payPeriodsPerYear = getPayPeriodsPerYear(rule.payFrequency);
                return (
                  <div key={rule.id} className="list-item" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="list-item__body">
                      <div className="list-item__title">{rule.name}</div>
                      <div className="list-item__meta">
                        {formatMoney(rule.contributionAmount)} → <strong>{formatMoney(newContribution)}</strong> per paycheck · {payPeriodsPerYear} paychecks a year
                      </div>
                    </div>
                    <div className="list-item__amount money-pos">
                      {formatMoney(increase * payPeriodsPerYear, true)}
                      <small>per year</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="alert alert--info">
              <LightbulbIcon size={18} />
              <div>Keeps the balance above the safe minimum and builds a cushion month over month.</div>
            </div>

            <div className="dialog-actions">
              <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={confirmImplementation} className="btn btn-primary">
                <CheckIcon size={16} /> Apply increase
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function
function getPayPeriodsPerYear(payFrequency: string): number {
  switch (payFrequency) {
    case 'weekly':
      return 52;
    case 'bi_weekly':
      return 26;
    case 'semi_monthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 24;
  }
}

