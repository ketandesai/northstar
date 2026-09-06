import { plaidClient } from './plaid';
import { db } from './db';
import { DEFAULT_GUEST_USER_ID } from '@/types/database';

export interface BalanceRefreshSummary {
  itemsRefreshed: number;
  accountsUpdated: number;
  snapshotsWritten: number;
  userIds: string[];
}

interface PlaidItemRow {
  item_id: string;
  user_id: string;
  access_token: string | null;
}

/**
 * Refreshes the latest balances from Plaid for all linked items matching
 * the given user ids (defaults to the guest user) and records a daily
 * balance-history snapshot for each account.
 *
 * Demo accounts (those without a `plaid_items` row / access token) are
 * skipped automatically.
 */
export async function refreshBalances(
  userIds: string[] = [DEFAULT_GUEST_USER_ID]
): Promise<BalanceRefreshSummary> {
  const summary: BalanceRefreshSummary = {
    itemsRefreshed: 0,
    accountsUpdated: 0,
    snapshotsWritten: 0,
    userIds,
  };

  const itemsResult = await db.query<PlaidItemRow>(
    `SELECT item_id, user_id, access_token FROM plaid_items WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  );
  const items = itemsResult.rows;

  const today = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    if (!item.access_token) continue;

    let accountsResponse;
    try {
      accountsResponse = await plaidClient.accountsGet({ access_token: item.access_token });
    } catch (error) {
      console.error(
        `Error refreshing balances for item ${item.item_id}:`,
        (error as { response?: { data?: unknown }; message?: string })?.response?.data ||
          (error as { message?: string })?.message ||
          error
      );
      continue;
    }

    const accounts = accountsResponse.data.accounts;
    summary.itemsRefreshed += 1;

    for (const acc of accounts) {
      if (!acc.account_id) continue;

      const available =
        acc.balances.available !== null && acc.balances.available !== undefined
          ? acc.balances.available
          : null;
      const current =
        acc.balances.current !== null && acc.balances.current !== undefined
          ? acc.balances.current
          : null;
      const isoCurrencyCode = acc.balances.iso_currency_code || 'USD';

      const updatedAt = new Date().toISOString();

      await db.query(
        `UPDATE accounts
         SET available_balance = $2,
             current_balance = $3,
             iso_currency_code = $4,
             updated_at = $5
         WHERE id = $1`,
        [acc.account_id, available, current, isoCurrencyCode, updatedAt]
      );

      if (acc.balances.current === null && acc.balances.available === null) {
        continue;
      }

      await db.query(
        `INSERT INTO balance_history (
           account_id, user_id, snapshot_date, available_balance, current_balance,
           iso_currency_code, source
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'plaid')
         ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
           available_balance = EXCLUDED.available_balance,
           current_balance = EXCLUDED.current_balance,
           iso_currency_code = EXCLUDED.iso_currency_code,
           source = EXCLUDED.source`,
        [acc.account_id, item.user_id, today, available, current, isoCurrencyCode]
      );

      summary.accountsUpdated += 1;
      summary.snapshotsWritten += 1;
    }
  }

  return summary;
}
