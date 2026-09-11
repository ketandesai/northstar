'use client';

import React from 'react';
import Header from '@/components/Header';
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
    refreshHomeValuation,
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
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Plaid Config Notice (if keys missing) */}
        <PlaidSetupBanner onLoadDemoAccount={addAccounts} />

        {/* Accounts List Section */}
        <ConnectedAccountsList
          accounts={accounts}
          isLoading={loading}
          onRemoveAccount={removeAccount}
          onAccountsAdded={addAccounts}
          onUpdateAccount={updateAccount}
          onRefreshHomeValue={refreshHomeValuation}
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
      </main>
    </div>
    </PlaidLinkProvider>
  );
}
