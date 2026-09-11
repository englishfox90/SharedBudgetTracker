'use client';

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '300px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '250px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No account found. Please set up your account in the Setup tab first.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No recommendation data available. Please set up income and expenses in the Setup tab.
      </div>
    );
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1))
    .toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-primary)',
          opacity: 0.7,
          zIndex: 10,
          borderRadius: '8px',
        }} />
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Financial Recommendations
        </h2>
        <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
          6-month outlook starting {monthName}
        </p>
      </div>

      {/* How This Works - Moved to top */}
      <details open style={{ ...cardStyle, background: 'var(--bg-tertiary)' }}>
        <summary style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          cursor: 'pointer',
          listStyle: 'none',
        }}>
          ℹ️ How This Works
        </summary>
        <ul style={{ paddingLeft: '1.5rem', fontSize: 'var(--font-body)', lineHeight: '1.6', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          <li>Analyzes your forecasted income and expenses for the next 6 months</li>
          <li>Compares actual variable spending to estimates based on historical data</li>
          <li>Identifies spending trends and potential issues before they impact your balance</li>
          <li>Provides actionable recommendations to maintain financial stability</li>
        </ul>
      </details>

      {/* Quick Action Button */}
      {data.contributionAnalysis.adjustmentNeeded && (
        <div style={{
          ...cardStyle,
          background: 'var(--warning-bg)',
          border: '2px solid var(--warning-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                ⚡ Action Required
              </h3>
              <p style={{ fontSize: 'var(--font-body)', color: 'var(--warning-text)' }}>
                Increase contributions by {Math.round(data.contributionAnalysis.adjustmentPercentage)}% to maintain safe balance
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '1.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 'var(--font-label)', color: 'var(--warning-text)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Current Annual
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                ${data.contributionAnalysis.currentAnnualContribution.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-label)', color: 'var(--warning-text)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Recommended Annual
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-danger)' }}>
                ${data.contributionAnalysis.recommendedAnnualContribution?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
          <div style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--warning-border)',
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)', lineHeight: '1.6' }}>
              Click below to automatically update your income rules to the recommended contribution amounts.
              This will increase your contributions proportionally across all income sources.
            </div>
            <button
              onClick={showImplementationModal}
              disabled={implementing || implementSuccess}
              style={{
                padding: '0.75rem 1.5rem',
                background: implementSuccess ? '#16a34a' : (implementing ? 'var(--text-secondary)' : 'var(--button-bg)'),
                color: implementSuccess || implementing ? 'white' : 'var(--button-text)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: (implementing || implementSuccess) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {implementSuccess ? '✓ Implemented Successfully!' : (implementing ? 'Updating...' : '⚡ Implement Recommendation')}
            </button>
          </div>

          {/* Comparison Chart - inside action required box */}
          <div style={{ marginTop: '1.5rem' }}>
            <ComparisonChart
              currentAnnual={data.contributionAnalysis.currentAnnualContribution}
              recommendedAnnual={data.contributionAnalysis.recommendedAnnualContribution || data.contributionAnalysis.currentAnnualContribution}
              months={data.sixMonthForecast.months}
            />
          </div>
        </div>
      )}

      {/* Suggestions */}
      <SuggestionCards suggestions={data.suggestions} />

      {/* 6-Month Overview */}
      <SixMonthOverview 
        months={data.sixMonthForecast.months} 
        safeMinBalance={data.sixMonthForecast.safeMinBalance}
      />

      {/* Financial Summary */}
      <VarianceSummary months={data.sixMonthForecast.months} />

      {/* Trend Analysis */}
      <TrendChart trends={data.trendAnalysis.expenses} />

      <MessageDialog
        open={!!message}
        onOpenChange={(open) => !open && setMessage(null)}
        title={message?.title || ''}
        message={message?.text || ''}
        type={message?.type || 'info'}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && data && (
        <>
          <div className="dialog-overlay" onClick={() => setShowConfirmModal(false)} />
          <div className="dialog-content dialog-content--wide" role="dialog" aria-modal="true" aria-labelledby="confirm-contribution-title">
            <h3 id="confirm-contribution-title" style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Confirm Contribution Increase
            </h3>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Annual Increase</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                ${(data.contributionAnalysis.recommendedAnnualContribution! - data.contributionAnalysis.currentAnnualContribution).toLocaleString()}/year
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                (~${Math.round((data.contributionAnalysis.recommendedAnnualContribution! - data.contributionAnalysis.currentAnnualContribution) / 12).toLocaleString()}/month)
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem' }}>Per-Person Breakdown:</div>
              {incomeRules.map((rule: any) => {
                const currentTotal = data.contributionAnalysis.currentAnnualContribution;
                const recommendedTotal = data.contributionAnalysis.recommendedAnnualContribution!;
                const adjustmentRatio = currentTotal > 0 ? recommendedTotal / currentTotal : 1;
                const newContribution = rule.contributionAmount * adjustmentRatio;
                const increase = newContribution - rule.contributionAmount;
                const payPeriodsPerYear = getPayPeriodsPerYear(rule.payFrequency);
                
                return (
                  <div key={rule.id} style={{
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{ fontSize: 'var(--font-body)', fontWeight: '600', marginBottom: '0.25rem' }}>{rule.name}</div>
                    <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem 0.75rem' }}>
                      <span>Current: ${rule.contributionAmount.toFixed(2)} per paycheck</span>
                      <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>→ ${newContribution.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      +${increase.toFixed(2)} per paycheck × {payPeriodsPerYear} = +${(increase * payPeriodsPerYear).toFixed(2)}/year
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: '6px',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: 'var(--font-body)', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--info-text)' }}>
                💡 Long-Term Impact
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--info-text)', lineHeight: '1.6' }}>
                This increase will keep your balance above the safe minimum and maintain positive monthly growth,
                preventing future cash flow issues and building a healthier financial cushion.
              </div>
            </div>

            <div className="dialog-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmImplementation}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--button-bg)',
                  color: 'var(--button-text)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✓ Approve & Implement
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

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};
