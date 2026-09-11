import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatTimestamp } from './format';

interface MetricsBannerProps {
  totalBalance: number;
  trackedCount: number;
  institutionCount: number;
  lastRefreshedAt?: string | null;
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtext: string;
}

const MetricCard = ({ label, value, subtext }: MetricCardProps) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {label}
    </span>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
    <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">{subtext}</span>
  </div>
);

export default function MetricsBanner({
  totalBalance,
  trackedCount,
  institutionCount,
  lastRefreshedAt = null,
}: MetricsBannerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        label="Total Net Worth"
        value={formatCurrency(totalBalance)}
        subtext={`Across ${trackedCount} ${trackedCount === 1 ? 'account & asset' : 'accounts & assets'}`}
      />

      
    </div>
  );
}