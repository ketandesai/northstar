'use client';

import React, { useMemo, useRef, useState } from 'react';
import { NetWorthPoint } from '@/types/database';
import {
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  Loader2,
  TrendingUp,
} from 'lucide-react';

type RangeKey = 30 | 90 | 'all';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 30, label: '30D' },
  { key: 90, label: '90D' },
  { key: 'all', label: 'All' },
];

const CHART_WIDTH = 740;
const CHART_HEIGHT = 260;
const PAD = { left: 58, right: 18, top: 16, bottom: 36 };

interface NetWorthChartProps {
  points: NetWorthPoint[];
  loading?: boolean;
  error?: string | null;
}

function formatCurrency(value: number): string {
  const digits = Math.abs(value) % 1 === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  let scaled = abs;
  let suffix = '';
  if (abs >= 1e9) {
    scaled = abs / 1e9;
    suffix = 'B';
  } else if (abs >= 1e6) {
    scaled = abs / 1e6;
    suffix = 'M';
  } else if (abs >= 1e3) {
    scaled = abs / 1e3;
    suffix = 'k';
  }
  const digits = scaled >= 100 ? 0 : scaled >= 1 ? 1 : 2;
  return `${value < 0 ? '-' : ''}$${scaled.toFixed(digits)}${suffix}`;
}

function formatDateLabel(date: string, includeYear: boolean): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

function formatDateFull(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeTicks(min: number, max: number, count = 4): number[] {
  const span = max - min;
  const rawStep = (span > 0 ? span : Math.abs(max) || 1) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let mult: number;
  if (norm >= 5) mult = 5;
  else if (norm >= 2) mult = 2;
  else if (norm >= 1) mult = 1;
  else mult = 0.5;
  const step = mult * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  if (ticks.length < 2) {
    const center = (min + max) / 2 || 0;
    return [center - step, center + step];
  }
  return ticks;
}

function pickLabelIndices(n: number): number[] {
  if (n <= 1) return [0];
  const count = Math.min(4, n);
  const indices = new Set<number>([0, n - 1]);
  for (let i = 1; i < count - 1; i++) {
    indices.add(Math.floor((i * (n - 1)) / (count - 1)));
  }
  return [...indices].sort((a, b) => a - b);
}

export default function NetWorthChart({
  points,
  loading = false,
  error = null,
}: NetWorthChartProps) {
  const [range, setRange] = useState<RangeKey>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const cutoffDate = useMemo(() => {
    if (range === 'all' || points.length === 0) return null;
    const d = new Date(`${points[points.length - 1].date}T00:00:00`);
    d.setUTCDate(d.getUTCDate() - range);
    return d.toISOString().slice(0, 10);
  }, [range, points]);

  const displayPoints = useMemo(() => {
    if (!cutoffDate) return points;
    const filtered = points.filter((p) => p.date >= cutoffDate);
    return filtered.length > 0 ? filtered : points;
  }, [points, cutoffDate]);

  const chart = useMemo(() => {
    const n = displayPoints.length;
    if (n === 0) return null;

    const values = displayPoints.map((p) => p.netWorth);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const pad = ((maxV - minV) || Math.abs(maxV) || 100) * 0.1;
    const ticks = computeTicks(minV - pad, maxV + pad);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];

    const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
    const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) =>
      n === 1 ? PAD.left + innerWidth / 2 : PAD.left + (innerWidth * i) / (n - 1);
    const y = (v: number) =>
      PAD.top + innerHeight * (1 - (v - yMin) / (yMax - yMin));

    const linePoints = displayPoints
      .map((_, i) => `${x(i).toFixed(2)},${y(values[i]).toFixed(2)}`)
      .join(' ');
    const baseline = PAD.top + innerHeight;
    const areaPath = [
      `M ${x(0).toFixed(2)} ${baseline}`,
      ...displayPoints.map((_, i) => `L ${x(i).toFixed(2)} ${y(values[i]).toFixed(2)}`),
      `L ${x(n - 1).toFixed(2)} ${baseline}`,
      'Z',
    ].join(' ');

    return {
      x,
      y,
      ticks,
      yMin,
      yMax,
      innerWidth,
      innerHeight,
      linePoints,
      areaPath,
      labelIndices: pickLabelIndices(n),
      n,
    };
  }, [displayPoints]);

  const latest = displayPoints.length > 0 ? displayPoints[displayPoints.length - 1].netWorth : 0;
  const first = displayPoints.length > 0 ? displayPoints[0].netWorth : 0;
  const delta = latest - first;
  const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;

  const hoverInfo = useMemo(() => {
    if (!chart || hoverIndex === null || hoverIndex >= displayPoints.length) return null;
    const point = displayPoints[hoverIndex];
    return {
      point,
      leftPct: Math.max(12, Math.min(88, (chart.x(hoverIndex) / CHART_WIDTH) * 100)),
      topPct: (chart.y(point.netWorth) / CHART_HEIGHT) * 100,
    };
  }, [chart, hoverIndex, displayPoints]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chart || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const idx = Math.round(((localX - PAD.left) / chart.innerWidth) * (chart.n - 1));
    setHoverIndex(Math.max(0, Math.min(chart.n - 1, idx)));
  };

  const header = (
    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Net Worth Over Time
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Daily snapshot from balance history
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 self-start sm:self-center p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              range === r.key
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading && points.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        {header}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Loading balance history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
      {header}

      <div className="px-6 py-5">
        {displayPoints.length > 0 && (
          <div className="flex items-end justify-between gap-4 mb-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Latest Net Worth
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatCurrency(latest)}
              </div>
            </div>
            {displayPoints.length > 1 && delta !== 0 && (
              <div
                className={`inline-flex items-center gap-1 text-sm font-semibold ${
                  delta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {formatCurrency(Math.abs(delta))}
                {deltaPct !== null && (
                  <span className="text-xs font-medium opacity-80">
                    ({deltaPct.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {error && displayPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <LineChart className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Unable to load balance history
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{error}</p>
          </div>
        )}

        {!error && chart === null && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <TrendingUp className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No balance history yet
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mt-1">
              Balance snapshots are recorded daily once accounts are connected and synced.
            </p>
          </div>
        )}

        {chart !== null && (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-auto select-none text-zinc-400 dark:text-zinc-500"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="netWorthArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {chart.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    y1={chart.y(t)}
                    x2={PAD.left + chart.innerWidth}
                    y2={chart.y(t)}
                    stroke="currentColor"
                    strokeOpacity="0.14"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 10}
                    y={chart.y(t) + 4}
                    textAnchor="end"
                    fontSize="13"
                    className="fill-current"
                  >
                    {formatAxisValue(t)}
                  </text>
                </g>
              ))}

              {chart.yMin < 0 && chart.yMax > 0 && (
                <line
                  x1={PAD.left}
                  y1={chart.y(0)}
                  x2={PAD.left + chart.innerWidth}
                  y2={chart.y(0)}
                  stroke="currentColor"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                />
              )}

              <polygon points={chart.areaPath} fill="url(#netWorthArea)" />

              <polyline
                points={chart.linePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chart.labelIndices.map((i) => (
                <text
                  key={i}
                  x={chart.x(i)}
                  y={CHART_HEIGHT - 10}
                  textAnchor="middle"
                  fontSize="13"
                  className="fill-current"
                >
                  {formatDateLabel(displayPoints[i].date, range === 'all')}
                </text>
              ))}

              {hoverIndex !== null && (
                <g pointerEvents="none">
                  <line
                    x1={chart.x(hoverIndex)}
                    y1={PAD.top}
                    x2={chart.x(hoverIndex)}
                    y2={PAD.top + chart.innerHeight}
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx={chart.x(hoverIndex)}
                    cy={chart.y(displayPoints[hoverIndex].netWorth)}
                    r="4.5"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {hoverInfo && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[150%] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 shadow-lg"
                style={{ left: `${hoverInfo.leftPct}%`, top: `${hoverInfo.topPct}%` }}
              >
                <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-400">
                  {formatDateFull(hoverInfo.point.date)}
                </div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(hoverInfo.point.netWorth)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}