import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DEFAULT_GUEST_USER_ID, NetWorthPoint } from '@/types/database';

interface NetWorthRow {
  date: string;
  net_worth: string | number;
}

export async function GET() {
  try {
    const rows = await query<NetWorthRow>(
      `SELECT bh.snapshot_date::text AS date,
              SUM(
                CASE WHEN a.type IN ('credit', 'loan')
                     THEN -COALESCE(bh.current_balance, bh.available_balance, 0)
                     ELSE  COALESCE(bh.current_balance, bh.available_balance, 0)
                END
              )::float8 AS net_worth
       FROM balance_history bh
       JOIN accounts a ON a.id = bh.account_id
       WHERE bh.user_id = $1
       GROUP BY bh.snapshot_date
       ORDER BY bh.snapshot_date ASC`,
      [DEFAULT_GUEST_USER_ID]
    );

    const points: NetWorthPoint[] = rows.map((row) => ({
      date: row.date,
      netWorth: Number(row.net_worth),
    }));

    return NextResponse.json({
      success: true,
      points,
    });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error('Server error fetching balance history:', err);
    const isMissingTable = err.code === '42P01';
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'PostgreSQL tables not initialized. Please run db/migrations/20260904_initial_schema.sql and db/migrations/20260915_balance_history.sql against your database.'
          : err.message || 'Unexpected server error while fetching balance history',
        code: isMissingTable ? 'DB_QUERY_ERROR' : 'INTERNAL_SERVER_ERROR',
        hint: isMissingTable ? 'Run the SQL schema migrations against your PostgreSQL instance' : null,
      },
      { status: 500 }
    );
  }
}