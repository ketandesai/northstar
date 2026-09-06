import { NextResponse } from 'next/server';
import { isPlaidConfigured } from '@/lib/plaid';
import { refreshBalances } from '@/lib/plaid-sync';
import { DEFAULT_GUEST_USER_ID } from '@/types/database';

export async function POST() {
  try {
    if (!isPlaidConfigured) {
      return NextResponse.json(
        {
          error: 'Plaid credentials not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET in .env.local',
          code: 'PLAID_NOT_CONFIGURED',
        },
        { status: 400 }
      );
    }

    const summary = await refreshBalances([DEFAULT_GUEST_USER_ID]);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: unknown) {
    const errorObj = error as {
      response?: {
        data?: {
          error_message?: string;
          error_code?: string;
          display_message?: string;
        };
      };
      message?: string;
    };

    console.error('Error refreshing balances:', errorObj?.response?.data || errorObj?.message || error);
    const plaidData = errorObj?.response?.data;
    return NextResponse.json(
      {
        error: plaidData?.error_message || errorObj?.message || 'Failed to refresh balances',
        code: plaidData?.error_code || 'REFRESH_BALANCES_FAILED',
        display_message: plaidData?.display_message || null,
      },
      { status: 500 }
    );
  }
}
