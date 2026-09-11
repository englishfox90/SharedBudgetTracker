'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
  emphasis?: boolean;
}

interface Props {
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Optional horizontal reference line (e.g. safe minimum) */
  reference?: { value: number; label: string };
  ariaLabel?: string;
}

const PAD = { top: 12, right: 12, bottom: 28, left: 8 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (max === min) {
    const d = Math.abs(max) || 1;
    return [min - d, min, min + d];
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

const defaultFormat = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

/**
 * Responsive multi-series line chart with a crosshair tooltip (pointer and
 * touch), a legend below the plot, and recessive gridlines. No dependency.
 */
export default function LineChart({ labels, series, height = 240, formatValue = defaultFormat, reference, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(0, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    if (reference) all.push(reference.value);
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    const ticks = niceTicks(min, max);
    min = Math.min(min, ticks[0]);
    max = Math.max(max, ticks[ticks.length - 1]);
    return { min, max, ticks };
  }, [series, reference]);

  // Reserve room for the widest tick label so the plot never overlaps axis text
  const tickLabels = model.ticks.map(formatValue);
  const leftPad = PAD.left + Math.max(...tickLabels.map((t) => t.length)) * 6.6 + 8;

  const plotW = Math.max(0, width - leftPad - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const x = (i: number) => leftPad + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - model.min) / (model.max - model.min || 1)) * plotH;

  function path(values: number[]) {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  }

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    if (n === 0 || plotW <= 0) return;
    // A second tap on the same point dismisses the tooltip on touch screens
    if (e.type === 'pointerdown' && e.pointerType === 'touch' && active !== null) {
      const rect = e.currentTarget.getBoundingClientRect();
      const idx = Math.round(Math.min(1, Math.max(0, (e.clientX - rect.left - leftPad) / plotW)) * (n - 1));
      if (idx === active) { setActive(null); return; }
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const t = (px - leftPad) / plotW;
    const idx = Math.round(Math.min(1, Math.max(0, t)) * (n - 1));
    setActive(idx);
  }

  const tooltipLeft = active !== null ? x(active) : 0;
  const flip = width > 0 && tooltipLeft > width * 0.6;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg
          className="chart-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActive(null); }}
          style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
        >
          {model.ticks.map((t, i) => (
            <g key={i}>
              <line x1={leftPad} x2={leftPad + plotW} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={leftPad - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {tickLabels[i]}
              </text>
            </g>
          ))}

          {reference && (
            <g>
              <line x1={leftPad} x2={leftPad + plotW} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--color-warning)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={leftPad + plotW} y={y(reference.value) - 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                {reference.label}
              </text>
            </g>
          )}

          {labels.map((l, i) => {
            const every = n > 6 ? Math.ceil(n / 6) : 1;
            if (i % every !== 0 && i !== n - 1) return null;
            const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
            return (
              <text key={i} x={x(i)} y={height - 8} textAnchor={anchor} fontSize="11" fill="var(--text-muted)">
                {l}
              </text>
            );
          })}

          {series.map((s) => (
            <g key={s.key}>
              {s.emphasis && (
                <path d={`${path(s.values)} L ${x(n - 1).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`} fill={s.color} opacity={0.08} />
              )}
              <path
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.emphasis ? 2.5 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '5 5' : undefined}
              />
            </g>
          ))}

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--chart-axis)" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke="var(--bg-secondary)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}

      {active !== null && (
        <div
          className="chart-tooltip"
          style={{
            top: PAD.top,
            left: flip ? undefined : tooltipLeft + 12,
            right: flip ? width - tooltipLeft + 12 : undefined,
          }}
        >
          <div className="chart-tooltip__title">{labels[active]}</div>
          {series.map((s) => (
            <div key={s.key} className="chart-tooltip__row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                <span className="chart-tooltip__key" style={{ color: s.color }} />
                {s.label}
              </span>
              <span className="chart-tooltip__value">{formatValue(s.values[active])}</span>
            </div>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="chart-legend" aria-hidden="true">
          {series.map((s) => (
            <span key={s.key} className="chart-legend__item">
              <span className="chart-legend__key" style={{ borderTopColor: s.color, borderTopStyle: s.dashed ? 'dashed' : 'solid' }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
