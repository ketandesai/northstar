import React from 'react';
import { CheckCircle2, Loader2, RefreshCw, Plus, Package } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';
import AddAccountButton from '../AddAccountButton';
import { formatCurrency, formatTimestamp } from './format';

interface MetricsBannerProps {
  totalBalance: number;
  trackedCount: number;
  institutionCount: number;
  lastRefreshedAt?: string | null;
  isRefreshing?: boolean;
  onRefreshBalances?: () => void;
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  onAddAsset: () => void;
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
  isRefreshing = false,
  onRefreshBalances,
  onAccountsAdded,
  onAddAsset,
}: MetricsBannerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        label="Total Net Balance"
        value={formatCurrency(totalBalance)}
        subtext={`Across ${trackedCount} ${trackedCount === 1 ? 'account & asset' : 'accounts & assets'}`}
      />

      <MetricCard
        label="Connected Institutions"
        value={institutionCount}
        subtext="Secured via Plaid Link"
      />

      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Connection Status
          </span>
          <div className="mt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active & Syncing</span>
          </div>
          {lastRefreshedAt && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
              Last updated {formatTimestamp(lastRefreshedAt)}
            </span>
          )}
        </div>
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onRefreshBalances}
            disabled={isRefreshing || !onRefreshBalances}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Refresh balances"
          >
            {isRefreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh balances'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <AddAccountButton onAccountsAdded={onAccountsAdded} variant="compact" />
            <button
              type="button"
              onClick={onAddAsset}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800/60 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <Package className="w-3.5 h-3.5 opacity-80" />
              <span>Add Asset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}