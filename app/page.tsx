'use client';

import React from 'react';
import { Compass, ShieldCheck, Zap, RefreshCw, Landmark } from 'lucide-react';
import AddAccountButton from '@/components/AddAccountButton';
import ConnectedAccountsList from '@/components/ConnectedAccountsList';
import NetWorthChart from '@/components/NetWorthChart';
import PlaidSetupBanner from '@/components/PlaidSetupBanner';
import { PlaidLinkProvider } from '@/components/PlaidLinkProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useNetWorth } from '@/hooks/useNetWorth';

export default function Home() {
  const {
    accounts,
    loading,
    isRefreshing,
    lastRefreshedAt,
    addAccounts,
    updateAccount,
    removeAccount,
    refreshBalances,
  } = useAccounts();

  const { points: netWorthPoints, loading: netWorthLoading, error: netWorthError } =
    useNetWorth(
      accounts.map((a) => `${a.id}@${a.updatedAt ?? ''}`)
    );

  return (
    <PlaidLinkProvider>
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Northstar</span>
                <span className="text-[10px] uppercase font-semibold tracking-widest px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Finance
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AddAccountButton onAccountsAdded={addAccounts} variant="primary" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Plaid Config Notice (if keys missing) */}
        <PlaidSetupBanner onLoadDemoAccount={addAccounts} />

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Financial Overview
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Connect your bank accounts securely with Plaid, and add manual assets like your home,
              car, and private equity to track your full net worth.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>256-bit Bank-grade Encryption</span>
          </div>
        </div>

        {/* Accounts List Section */}
        <ConnectedAccountsList
          accounts={accounts}
          isLoading={loading}
          onRemoveAccount={removeAccount}
          onAccountsAdded={addAccounts}
          onUpdateAccount={updateAccount}
          onRefreshBalances={refreshBalances}
          isRefreshing={isRefreshing}
          lastRefreshedAt={lastRefreshedAt}
        />

        {/* Net Worth Trend Section */}
        <div className="mt-8">
          <NetWorthChart
            points={netWorthPoints}
            loading={netWorthLoading}
            error={netWorthError}
          />
        </div>

        {/* Value Prop Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                12,000+ Institutions
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Direct integration with Chase, Bank of America, Wells Fargo, Citi, and thousands of credit unions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Instant Account Verification
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Authenticate in seconds without waiting for micro-deposits or manual paperwork.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Live Balance Sync
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Real-time current and available balance updates synced through Plaid APIs.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
    </PlaidLinkProvider>
  );
}
