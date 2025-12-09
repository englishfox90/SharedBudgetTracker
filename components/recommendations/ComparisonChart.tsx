'use client';

interface ComparisonChartProps {
  currentAnnual: number;
  recommendedAnnual: number;
  months: Array<{
    monthName: string;
    totalIncome: number;
    closingBalance: number;
  }>;
}

export default function ComparisonChart({ currentAnnual, recommendedAnnual, months }: ComparisonChartProps) {
  if (months.length === 0) return null;

  // Chart dimensions - more compact
  const width = 100; // percentage-based for responsiveness
  const height = 280;
  const padding = { top: 15, right: 160, bottom: 35, left: 60 };

  // Calculate adjustment ratio for recommended scenario
  const adjustmentRatio = recommendedAnnual / currentAnnual;

  // Find min/max values for scaling
  const allBalances = months.flatMap(m => [m.closingBalance]);
  const allIncomes = months.flatMap(m => [m.totalIncome]);
  
  // Recommended scenario: adjust income and recalculate balances
  const recommendedMonths = months.map((month, idx) => {
    const additionalIncome = month.totalIncome * (adjustmentRatio - 1);
    const recommendedIncome = month.totalIncome + additionalIncome;
    
    // Approximate balance with additional income (cumulative)
    let cumulativeIncrease = 0;
    for (let i = 0; i <= idx; i++) {
      cumulativeIncrease += months[i].totalIncome * (adjustmentRatio - 1);
    }
    const recommendedBalance = month.closingBalance + cumulativeIncrease;
    
    allBalances.push(recommendedBalance);
    allIncomes.push(recommendedIncome);
    
    return {
      monthName: month.monthName,
      income: recommendedIncome,
      balance: recommendedBalance,
    };
  });

  const minBalance = Math.min(...allBalances);
  const maxBalance = Math.max(...allBalances);
  const minIncome = Math.min(...allIncomes);
  const maxIncome = Math.max(...allIncomes);

  const balanceRange = maxBalance - minBalance;
  const incomeRange = maxIncome - minIncome;

  // Chart dimensions - more compact
  const svgWidth = 750;
  const svgHeight = 280;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (index: number) => (index / (months.length - 1)) * chartWidth;
  const scaleBalanceY = (value: number) => {
    return chartHeight - ((value - minBalance) / balanceRange) * chartHeight;
  };
  const scaleIncomeY = (value: number) => {
    return chartHeight - ((value - minIncome) / incomeRange) * chartHeight;
  };

  // Generate path for a line
  const generatePath = (data: number[], scaleY: (v: number) => number) => {
    return data.map((value, i) => {
      const x = scaleX(i);
      const y = scaleY(value);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const currentIncomePath = generatePath(months.map(m => m.totalIncome), scaleIncomeY);
  const currentBalancePath = generatePath(months.map(m => m.closingBalance), scaleBalanceY);
  const recommendedIncomePath = generatePath(recommendedMonths.map(m => m.income), scaleIncomeY);
  const recommendedBalancePath = generatePath(recommendedMonths.map(m => m.balance), scaleBalanceY);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: '8px',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1rem' }}>📊</span>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          6-Month Impact Projection
        </h4>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '100%', height: 'auto' }}>
        {/* Chart area */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartHeight * (1 - tick);
            return (
              <line
                key={tick}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#e0e0e0"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Current Income line (dashed blue) */}
          <path
            d={currentIncomePath}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
          />

          {/* Current Balance line (solid blue) */}
          <path
            d={currentBalancePath}
            stroke="#1e40af"
            strokeWidth={3}
            fill="none"
          />

          {/* Recommended Income line (dashed green) */}
          <path
            d={recommendedIncomePath}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
          />

          {/* Recommended Balance line (solid green) */}
          <path
            d={recommendedBalancePath}
            stroke="#15803d"
            strokeWidth={3}
            fill="none"
          />

          {/* Data points */}
          {months.map((month, i) => {
            const x = scaleX(i);
            return (
              <g key={i}>
                <circle cx={x} cy={scaleBalanceY(month.closingBalance)} r={4} fill="#1e40af" />
                <circle cx={x} cy={scaleBalanceY(recommendedMonths[i].balance)} r={4} fill="#15803d" />
              </g>
            );
          })}

          {/* X-axis labels */}
          {months.map((month, i) => {
            const x = scaleX(i);
            return (
              <text
                key={i}
                x={x}
                y={chartHeight + 25}
                textAnchor="middle"
                fontSize="12"
                fill="var(--text-secondary)"
              >
                {month.monthName.split(' ')[0]}
              </text>
            );
          })}

          {/* Y-axis labels (Balance) */}
          <text
            x={-10}
            y={-20}
            textAnchor="end"
            fontSize="12"
            fontWeight="600"
            fill="#1a1a1a"
          >
            Balance ($)
          </text>
          {[0, 0.5, 1].map((tick) => {
            const y = chartHeight * (1 - tick);
            const value = minBalance + balanceRange * tick;
            return (
              <text
                key={tick}
                x={-10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                ${Math.round(value).toLocaleString()}
              </text>
            );
          })}
        </g>

        {/* Legend */}
        <g transform={`translate(${svgWidth - padding.right + 20}, ${padding.top})`}>
          <text x={0} y={0} fontSize="11" fontWeight="600" fill="var(--text-primary)">Legend</text>
          
          {/* Current Balance */}
          <line x1={0} y1={20} x2={25} y2={20} stroke="#1e40af" strokeWidth={2.5} />
          <text x={30} y={24} fontSize="10" fill="var(--text-secondary)">Current Balance</text>
          
          {/* Current Income */}
          <line x1={0} y1={38} x2={25} y2={38} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
          <text x={30} y={42} fontSize="10" fill="var(--text-secondary)">Current Income</text>
          
          {/* Recommended Balance */}
          <line x1={0} y1={56} x2={25} y2={56} stroke="#15803d" strokeWidth={2.5} />
          <text x={30} y={60} fontSize="10" fill="var(--text-secondary)">Recommended Balance</text>
          
          {/* Recommended Income */}
          <line x1={0} y1={74} x2={25} y2={74} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
          <text x={30} y={78} fontSize="10" fill="var(--text-secondary)">Recommended Income</text>
        </g>
      </svg>
      </div>

      <div style={{
        padding: '0.875rem',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '6px',
      }}>
        <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: '1.5' }}>
          <strong>Impact:</strong> The green lines show how implementing the recommended contribution
          increases your monthly income and raises your ending balance, keeping you above the safe minimum.
        </div>
      </div>
    </div>
  );
}
