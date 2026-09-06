import { NextResponse } from 'next/server';
import { isPlaidConfigured } from '@/lib/plaid';
import { refreshBalances } from '@/lib/plaid-sync';
import { query } from '@/lib/db';

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const cronHeader = req.headers.get('x-cron-secret');
  return cronHeader === cronSecret;
}

export async function GET(req: Request) {
  try {
    if (!isPlaidConfigured) {
      return NextResponse.json(
        { error: 'Plaid not configured', code: 'PLAID_NOT_CONFIGURED' },
        { status: 400 }
      );
    }

    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Collect every user that has linked Plaid items so all balances are kept fresh.
    const userRows = await query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM plaid_items`
    );
    const userIds = userRows.map((r) => r.user_id);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, ...{ itemsRefreshed: 0, accountsUpdated: 0, snapshotsWritten: 0, userIds: [] } });
    }

    const summary = await refreshBalances(userIds);

    return NextResponse.json({ success: true, ...summary });
  } catch (error: unknown) {
    const errorObj = error as {
      response?: { data?: { error_message?: string; error_code?: string } };
      message?: string;
    };
    console.error('Cron error refreshing balances:', errorObj?.response?.data || errorObj?.message || error);
    return NextResponse.json(
      {
        error: errorObj?.response?.data?.error_message || errorObj?.message || 'Cron refresh failed',
        code: errorObj?.response?.data?.error_code || 'CRON_REFRESH_FAILED',
      },
      { status: 500 }
    );
  }
}
