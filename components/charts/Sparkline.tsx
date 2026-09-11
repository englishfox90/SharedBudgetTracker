'use client';

interface Props {
  values: number[];
  /** Horizontal reference (e.g. safe minimum) drawn as a dashed hairline */
  reference?: number;
  width?: number;
  height?: number;
  color?: string;
  /** Index to highlight with a marker (e.g. today) */
  markerIndex?: number | null;
}

/**
 * Tiny inline trend line for stat tiles and hero cards. Scales to its
 * container width via viewBox; no axes, no labels.
 */
export default function Sparkline({ values, reference, width = 160, height = 44, color = 'var(--accent)', markerIndex = null }: Props) {
  if (values.length < 2) return null;
  const all = reference !== undefined ? [...values, reference] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const pad = 4;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L ${x(values.length - 1).toFixed(1)} ${(height - pad).toFixed(1)} L ${x(0).toFixed(1)} ${(height - pad).toFixed(1)} Z`;

  const hasMarker = markerIndex !== null && markerIndex >= 0 && markerIndex < values.length;

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
        <path d={area} fill={color} opacity={0.1} />
        {reference !== undefined && (
          <line x1={pad} x2={width - pad} y1={y(reference)} y2={y(reference)} stroke="var(--color-warning)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {hasMarker && (
        /* Positioned in HTML so the non-uniform SVG scaling never squashes it */
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${(x(markerIndex as number) / width) * 100}%`,
            top: `${(y(values[markerIndex as number]) / height) * 100}%`,
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: color,
            boxShadow: '0 0 0 2px var(--bg-secondary)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
}
