'use client';

import { useState, useEffect } from 'react';
import { DashboardSummaryWidgets, RecommendationData } from './DashboardSummaryWidgets';
import SixMonthTrendChart from './dashboard/SixMonthTrendChart';
import { getCurrentMonthUTC } from '@/lib/date-utils';
import { useAccount } from '@/contexts/AccountContext';

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const { account, loading: accountLoading } = useAccount();
  const [sixMonthData, setSixMonthData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData(accountId: number) {
    try {
      // One recommendations request feeds both the summary widgets and the trend chart
      const currentMonth = getCurrentMonthUTC();
      const recommendationsRes = await fetch(
        `/api/recommendations?accountId=${accountId}&year=${currentMonth.year}&month=${currentMonth.month}`
      );
      const recsData = await recommendationsRes.json();

      if (recsData?.sixMonthForecast) {
        setSixMonthData(recsData.sixMonthForecast);
      }
      setRecommendations({
        insights: recsData?.suggestions || [],
        suggestedContribution: recsData?.contributionAnalysis?.recommendedAnnualContribution || 0,
        adjustmentNeeded: recsData?.contributionAnalysis?.adjustmentNeeded || false,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (account) {
      loadData(account.id);
    } else if (!accountLoading) {
      setLoading(false);
    }
  }, [account?.id, accountLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || accountLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: '110px' }} />
        <div className="skeleton" style={{ height: '110px' }} />
        <div className="skeleton" style={{ height: '110px' }} />
        <div className="skeleton" style={{ height: '320px', marginTop: '1rem' }} />
      </div>
    );
  }

  if (!account) {
    return (
      <div>
        <p>No account found. Please set up an account in the Setup tab.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <DashboardSummaryWidgets accountId={account.id} recommendations={recommendations} onNavigate={onNavigate} />
      
      {/* 6-Month Trend Chart */}
      {sixMonthData && sixMonthData.months && sixMonthData.months.length > 0 && (
        <SixMonthTrendChart months={sixMonthData.months} />
      )}
    </div>
  );
}
