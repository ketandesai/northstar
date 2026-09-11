'use client';

import React, { useMemo } from 'react';
import { PieChart, Loader2 } from 'lucide-react';
import {
  ConnectedAccount,
} from '@/types/account';
import {
  summarizeAllocations,
  getTotalValue,
} from '@/lib/account-allocation';
import DonutChart from './charts/DonutChart';
import { formatCurrency } from './accounts/format';

interface AllocationCardProps {
  accounts: ConnectedAccount[];
  loading?: boolean;
}

export default function AllocationCard({
  accounts,
  loading = false,
}: AllocationCardProps) {
  const slices = useMemo(() => summarizeAllocations(accounts), [accounts]);
  const totalValue = useMemo(() => getTotalValue(slices), [slices]);

  const header = (
    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
        <PieChart className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
          Asset Allocation
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Accounts grouped by category
        </p>
      </div>
    </div>
  );

  if (loading && accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        {header}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Loading allocation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
      {header}

      <div className="px-6 py-6">
        {slices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PieChart className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No asset allocation yet
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mt-1">
              Add bank accounts and assets to see how your money is allocated
              across retirement, cash, property, and investments.
            </p>
          </div>
        ) : (
          <DonutChart
            data={slices.map((s) => ({ id: s.key, label: s.label, value: s.value, color: s.color }))}
            centerValue={formatCurrency(totalValue)}
            centerLabel="Total Assets"
            formatValue={(value) => formatCurrency(value)}
          />
        )}
      </div>
    </div>
  );
}