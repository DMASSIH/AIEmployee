'use client';

import { useId, useState } from 'react';
import { cn } from './lib/cn';

/**
 * Lightweight, dependency-free SVG charts. Deterministic output (safe for SSR
 * hydration) and themed via currentColor / chart tokens.
 */

function scale(points: number[], w: number, h: number, pad = 4): [number, number][] {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = (w - pad * 2) / Math.max(points.length - 1, 1);
  return points.map((p, i) => [pad + i * step, h - pad - ((p - min) / range) * (h - pad * 2)]);
}

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const pts = scale(data, 96, 40);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 96 40" className={cn('size-full', className)} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export function LineChart({
  data,
  height = 220,
  formatValue = (v: number) => String(v),
  className,
}: {
  data: SeriesPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const pts = scale(data.map((d) => d.value), w, height, 16);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts.at(-1)![0].toFixed(1)},${height - 16} L${pts[0]![0].toFixed(1)},${height - 16} Z`;

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full text-accent"
        role="img"
        aria-label="Line chart"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="16"
            x2={w - 16}
            y1={height * f}
            y2={height * f}
            className="stroke-border"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <rect
              x={x - w / data.length / 2}
              y="0"
              width={w / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hover === i && <circle cx={x} cy={y} r="4" fill="currentColor" className="stroke-surface" strokeWidth="2" />}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1 text-xs font-medium text-ink-text shadow-pop">
          {data[hover]!.label} · {formatValue(data[hover]!.value)}
        </div>
      )}
      <div className="mt-1 flex justify-between px-4 text-[11px] text-text-3">
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 220,
  formatValue = (v: number) => String(v),
  className,
}: {
  data: SeriesPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = w / data.length;
  const bar = Math.min(slot * 0.55, 36);

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full text-accent" role="img" aria-label="Bar chart" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 28);
          return (
            <rect
              key={d.label}
              x={i * slot + (slot - bar) / 2}
              y={height - 12 - h}
              width={bar}
              height={h}
              rx="4"
              fill="currentColor"
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)}
              className="transition-opacity"
            />
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1 text-xs font-medium text-ink-text shadow-pop">
          {data[hover]!.label} · {formatValue(data[hover]!.value)}
        </div>
      )}
    </div>
  );
}

export function DonutChart({
  data,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 15.915; // circumference 100
  let offset = 25;

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <svg viewBox="0 0 42 42" className="size-36 shrink-0" role="img" aria-label="Donut chart">
        <circle cx="21" cy="21" r={r} fill="none" className="stroke-surface-3" strokeWidth="5" />
        {data.map((d) => {
          const frac = (d.value / total) * 100;
          const el = (
            <circle
              key={d.label}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${frac} ${100 - frac}`}
              strokeDashoffset={offset}
            />
          );
          offset -= frac;
          return el;
        })}
      </svg>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="text-text-2">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums text-text">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
