'use client';

import React, { useMemo, useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  id?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
}

const GAP = 0.035;

function polar(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): [number, number] {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function arcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  const [ox, oy] = polar(cx, cy, outerRadius, endAngle);
  const [ix, iy] = polar(cx, cy, innerRadius, endAngle);
  const [sx, sy] = polar(cx, cy, outerRadius, startAngle);
  return `M ${sx.toFixed(3)} ${sy.toFixed(3)} A ${outerRadius.toFixed(3)} ${outerRadius.toFixed(3)} 0 ${largeArcFlag} 1 ${ox.toFixed(3)} ${oy.toFixed(3)} L ${ix.toFixed(3)} ${iy.toFixed(3)} A ${innerRadius.toFixed(3)} ${innerRadius.toFixed(3)} 0 ${largeArcFlag} 0 ${sx.toFixed(3)} ${sy.toFixed(3)} Z`;
}

const defaultFormatValue = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const defaultFormatPercent = (value: number): string =>
  `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;

export default function DonutChart({
  data,
  size = 220,
  thickness = 26,
  centerLabel,
  centerValue,
  formatValue = defaultFormatValue,
  showLegend = true,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((sum, s) => sum + Math.max(0, s.value), 0), [data]);

  const segments = useMemo(() => {
    if (total <= 0) return [];
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - thickness / 2;
    const innerRadius = size / 2 - thickness / 2 - thickness;

    let angle = -Math.PI / 2;
    return data.map((slice) => {
      const sweep = (Math.max(0, slice.value) / total) * Math.PI * 2;
      const start = angle + GAP;
      const end = angle + sweep - GAP;
      const valid = end > start;
      const path = valid
        ? arcPath(cx, cy, outerRadius, innerRadius, start, end)
        : '';
      angle += sweep;
      return { ...slice, path, startAngle: start, endAngle: end };
    });
  }, [data, size, thickness, total]);

  const hasData = total > 0 && segments.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label="Asset allocation donut chart"
          className="select-none"
        >
          {!hasData && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - thickness / 2 - thickness / 2}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth={thickness}
              className="text-zinc-300 dark:text-zinc-600"
            />
          )}
          {segments.map((segment, index) => (
            <path
              key={segment.id ?? segment.label}
              d={segment.path}
              fill={segment.color}
              opacity={
                activeIndex === null || activeIndex === index ? 1 : 0.25
              }
              style={{
                transition: 'opacity 150ms ease',
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>

        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
            {centerValue !== undefined && (
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {showLegend && (
        <ul className="mt-5 w-full space-y-2">
          {segments.map((segment, index) => (
            <li
              key={`legend-${segment.id ?? segment.label}`}
              className="flex items-center justify-between gap-3 text-sm cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {segment.label}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {defaultFormatPercent(segment.value / total)}
                </span>
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {formatValue(segment.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}