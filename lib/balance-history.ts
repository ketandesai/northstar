import { query } from './db';

interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

/**
 * Upserts a daily balance-history snapshot for a single account.
 * The unique index (account_id, snapshot_date) keeps re-running the same
 * day idempotent: it updates the existing snapshot instead of duplicating.
 *
 * Uses the shared `query` helper by default, or an explicit client (e.g. a
 * transaction client, or the pool directly) when one is provided.
 */
export async function upsertBalanceSnapshot(input: {
  accountId: string;
  userId: string;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string;
  source: string;
  snapshotDate?: string;
  client?: Queryable;
}): Promise<void> {
  const snapshotDate =
    input.snapshotDate || new Date().toISOString().slice(0, 10);

  const sql = `INSERT INTO balance_history (
       account_id, user_id, snapshot_date, available_balance, current_balance,
       iso_currency_code, source
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
       available_balance = EXCLUDED.available_balance,
       current_balance = EXCLUDED.current_balance,
       iso_currency_code = EXCLUDED.iso_currency_code,
       source = EXCLUDED.source`;
  const params = [
    input.accountId,
    input.userId,
    snapshotDate,
    input.availableBalance,
    input.currentBalance,
    input.isoCurrencyCode,
    input.source,
  ];

  if (input.client) {
    await input.client.query(sql, params);
  } else {
    await query(sql, params);
  }
}