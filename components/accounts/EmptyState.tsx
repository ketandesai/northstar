import React from 'react';
import { Landmark, Plus, Package } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';
import AddAccountButton from '../AddAccountButton';

interface EmptyStateProps {
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  onAddAsset: () => void;
}

export default function EmptyState({ onAccountsAdded, onAddAsset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/40">
        <Landmark className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        No bank accounts or assets yet
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-6">
        Connect your bank accounts securely using Plaid to monitor balances and track
        transactions, or add assets like your home, car, and private equity manually.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AddAccountButton onAccountsAdded={onAccountsAdded} variant="primary" />
        <button
          type="button"
          onClick={onAddAsset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <Package className="w-4 h-4 opacity-80" />
          <span>Add Asset</span>
        </button>
      </div>
    </div>
  );
}