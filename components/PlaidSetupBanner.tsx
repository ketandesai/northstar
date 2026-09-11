'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Sparkles } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';
import Button from './ui/Button';

interface PlaidSetupBannerProps {
  onLoadDemoAccount?: (accounts: ConnectedAccount[]) => void;
}

export default function PlaidSetupBanner({ onLoadDemoAccount }: PlaidSetupBannerProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkConfig() {
      try {
        const res = await fetch('/api/plaid/config');
        const data = await res.json();
        if (isMounted) {
          setIsConfigured(Boolean(data.isConfigured));
        }
      } catch {
        if (isMounted) {
          setIsConfigured(false);
        }
      }
    }
    checkConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddDemoData = () => {
    if (!onLoadDemoAccount) return;
    const demoAccounts: ConnectedAccount[] = [
      {
        id: 'acc_demo_checking_01',
        name: 'Plaid Gold Standard Checking',
        officialName: 'Plaid Gold Standard Checking 01',
        mask: '0000',
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1250.75,
          current: 1250.75,
          isoCurrencyCode: 'USD',
        },
        institution: {
          id: 'ins_chase',
          name: 'Chase Bank (Sandbox Demo)',
        },
        connectedAt: new Date().toISOString(),
      },
      {
        id: 'acc_demo_savings_02',
        name: 'Plaid High Yield Savings',
        officialName: 'Plaid Platinum Savings Account',
        mask: '1111',
        type: 'depository',
        subtype: 'savings',
        balances: {
          available: 15420.5,
          current: 15420.5,
          isoCurrencyCode: 'USD',
        },
        institution: {
          id: 'ins_chase',
          name: 'Chase Bank (Sandbox Demo)',
        },
        connectedAt: new Date().toISOString(),
      },
    ];
    onLoadDemoAccount(demoAccounts);
  };

  if (isConfigured === null || isConfigured === true) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-5 mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-950 dark:text-amber-100 text-sm">
              Plaid API Keys Required for Live Sandbox Link
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 max-w-xl">
              To open the actual Plaid Link modal with sandbox banks, add your free{' '}
              <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[11px]">
                PLAID_CLIENT_ID
              </code>{' '}
              and{' '}
              <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[11px]">
                PLAID_SECRET
              </code>{' '}
              to <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[11px]">.env.local</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {onLoadDemoAccount && (
            <Button
              variant="amber"
              size="sm"
              onClick={handleAddDemoData}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Preview Demo Accounts
            </Button>
          )}
          <a
            href="https://dashboard.plaid.com/team/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline"
          >
            Get Keys <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
