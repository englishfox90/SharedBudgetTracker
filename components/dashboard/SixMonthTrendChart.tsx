'use client';

interface SixMonthTrendChartProps {
  months: Array<{
    monthName: string;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
  }>;
}

export default function SixMonthTrendChart({ months }: SixMonthTrendChartProps) {
  if (months.length === 0) return null;

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 300;
  const padding = { top: 20, right: 140, bottom: 40, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Find min/max values for scaling
  const allValues = months.flatMap(m => [
    m.totalIncome,
    m.totalExpenses,
    m.closingBalance
  ]);
  
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;

  // Scale functions
  const scaleX = (index: number) => (index / (months.length - 1)) * chartWidth;
  const scaleY = (value: number) => {
    return chartHeight - ((value - minValue) / valueRange) * chartHeight;
  };

  // Generate path for a line
  const generatePath = (data: number[]) => {
    return data.map((value, i) => {
      const x = scaleX(i);
      const y = scaleY(value);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const incomePath = generatePath(months.map(m => m.totalIncome));
  const expensesPath = generatePath(months.map(m => m.totalExpenses));
  const balancePath = generatePath(months.map(m => m.closingBalance));

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(tick => {
    return minValue + valueRange * tick;
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '1rem' }}>📈</span>
        <h3 style={titleStyle}>6-Month Financial Trend</h3>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
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
                  stroke="var(--border-primary)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Income line (dashed green) */}
            <path
              d={incomePath}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
            />

            {/* Expenses line (dashed red) */}
            <path
              d={expensesPath}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
            />

            {/* Balance line (solid blue) */}
            <path
              d={balancePath}
              stroke="#1e40af"
              strokeWidth={3}
              fill="none"
            />

            {/* Data points for balance */}
            {months.map((month, i) => (
              <circle
                key={i}
                cx={scaleX(i)}
                cy={scaleY(month.closingBalance)}
                r={4}
                fill="#1e40af"
              />
            ))}

            {/* X-axis labels */}
            {months.map((month, i) => (
              <text
                key={i}
                x={scaleX(i)}
                y={chartHeight + 25}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {month.monthName}
              </text>
            ))}

            {/* Y-axis */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke="var(--border-primary)"
              strokeWidth={1}
            />

            {/* Y-axis labels */}
            {yTicks.map((value, i) => {
              const y = chartHeight * (1 - i / (yTicks.length - 1));
              return (
                <text
                  key={i}
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
            
            {/* Balance */}
            <line x1={0} y1={20} x2={25} y2={20} stroke="#1e40af" strokeWidth={2.5} />
            <text x={30} y={24} fontSize="10" fill="var(--text-secondary)">Balance</text>
            
            {/* Income */}
            <line x1={0} y1={38} x2={25} y2={38} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
            <text x={30} y={42} fontSize="10" fill="var(--text-secondary)">Income</text>
            
            {/* Expenses */}
            <line x1={0} y1={56} x2={25} y2={56} stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" />
            <text x={30} y={60} fontSize="10" fill="var(--text-secondary)">Expenses</text>
          </g>
        </svg>
      </div>

      <div style={summaryStyle}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Track your account balance trend alongside income and expenses over the next 6 months.
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '8px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const summaryStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-secondary)',
  borderRadius: '6px',
};
