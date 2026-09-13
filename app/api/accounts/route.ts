import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  DEFAULT_GUEST_USER_ID,
  AccountRow,
  mapAccountRowToConnectedAccount,
  mapConnectedAccountToInsert,
} from '@/types/database';
import { ConnectedAccount } from '@/types/account';
import { upsertBalanceSnapshot } from '@/lib/balance-history';

export async function GET() {
  try {
    const rows = await query<AccountRow>(
      `SELECT * FROM accounts WHERE user_id = $1 ORDER BY connected_at DESC`,
      [DEFAULT_GUEST_USER_ID]
    );

    const accounts: ConnectedAccount[] = rows.map(mapAccountRowToConnectedAccount);

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error('Server error fetching accounts:', err);
    const isMissingTable = err.code === '42P01';
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'PostgreSQL tables not initialized. Please run db/migrations/20260904_initial_schema.sql against your database.'
          : err.message || 'Unexpected server error while fetching accounts',
        code: isMissingTable ? 'DB_QUERY_ERROR' : 'INTERNAL_SERVER_ERROR',
        hint: isMissingTable ? 'Run the SQL schema migration against your PostgreSQL instance' : null,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountsInput: ConnectedAccount[] = Array.isArray(body.accounts)
      ? body.accounts
      : body.account
      ? [body.account]
      : [];

    if (accountsInput.length === 0) {
      return NextResponse.json(
        { error: 'No accounts provided in request body', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Ensure guest profile exists before inserting accounts
    await query(
      `INSERT INTO profiles (id, email, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_GUEST_USER_ID, 'guest@northstar.local', 'Guest User']
    );

    const rowsToInsert = accountsInput.map((acc) =>
      mapConnectedAccountToInsert(acc, DEFAULT_GUEST_USER_ID)
    );

    const savedAccounts: ConnectedAccount[] = [];
    for (const row of rowsToInsert) {
      const inserted = await query<AccountRow>(
        `INSERT INTO accounts (
           id, user_id, item_id, name, official_name, mask, type, subtype, category,
           available_balance, current_balance, iso_currency_code,
           institution_id, institution_name, connected_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           item_id = EXCLUDED.item_id,
           name = EXCLUDED.name,
           official_name = EXCLUDED.official_name,
           mask = EXCLUDED.mask,
           type = EXCLUDED.type,
           subtype = EXCLUDED.subtype,
           category = EXCLUDED.category,
           available_balance = EXCLUDED.available_balance,
           current_balance = EXCLUDED.current_balance,
           iso_currency_code = EXCLUDED.iso_currency_code,
           institution_id = EXCLUDED.institution_id,
           institution_name = EXCLUDED.institution_name,
           connected_at = EXCLUDED.connected_at,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          row.id,
          row.user_id,
          row.item_id,
          row.name,
          row.official_name,
          row.mask,
          row.type,
          row.subtype,
          row.category,
          row.available_balance,
          row.current_balance,
          row.iso_currency_code,
          row.institution_id,
          row.institution_name,
          row.connected_at,
          row.updated_at,
        ]
      );
      savedAccounts.push(mapAccountRowToConnectedAccount(inserted[0]));

      await upsertBalanceSnapshot({
        accountId: row.id,
        userId: DEFAULT_GUEST_USER_ID,
        currentBalance: row.current_balance ?? null,
        availableBalance: row.available_balance ?? null,
        isoCurrencyCode: row.iso_currency_code || 'USD',
        source: 'manual',
      });
    }

    return NextResponse.json({
      success: true,
      accounts: savedAccounts,
    });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error('Server error saving accounts:', err);
    const isMissingTable = err.code === '42P01';
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'PostgreSQL tables not initialized. Please run db/migrations/20260904_initial_schema.sql against your database.'
          : err.message || 'Unexpected server error while saving accounts',
        code: isMissingTable ? 'DB_INSERT_ERROR' : 'INTERNAL_SERVER_ERROR',
        hint: isMissingTable ? 'Run the SQL schema migration against your PostgreSQL instance' : null,
      },
      { status: 500 }
    );
  }
}
