import { NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured } from '@/lib/plaid';
import { db } from '@/lib/db';
import { DEFAULT_GUEST_USER_ID, mapConnectedAccountToInsert } from '@/types/database';

export async function POST(req: Request) {
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

    const { public_token, institution } = await req.json();

    if (!public_token) {
      return NextResponse.json(
        { error: 'Missing public_token in request body', code: 'MISSING_PUBLIC_TOKEN' },
        { status: 400 }
      );
    }

    // Exchange public token for permanent access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Fetch accounts and balances using access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const institutionData = institution || {
      id: accountsResponse.data.item.institution_id || 'unknown',
      name: 'Connected Bank',
    };

    const accounts = accountsResponse.data.accounts.map((acc) => ({
      id: acc.account_id,
      name: acc.name,
      officialName: acc.official_name || acc.name,
      mask: acc.mask || '••••',
      type: acc.type,
      subtype: acc.subtype,
      balances: {
        available: acc.balances.available,
        current: acc.balances.current,
        isoCurrencyCode: acc.balances.iso_currency_code || 'USD',
      },
      institution: institutionData,
    }));

    // Persist Plaid Item & Accounts to PostgreSQL
    const dbClient = await db.connect();
    try {
      await dbClient.query('BEGIN');

      // Ensure default guest profile exists
      await dbClient.query(
        `INSERT INTO profiles (id, email, full_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [DEFAULT_GUEST_USER_ID, 'guest@northstar.local', 'Guest User']
      );

      // Persist Plaid Item with access_token securely
      await dbClient.query(
        `INSERT INTO plaid_items (user_id, item_id, access_token, institution_id, institution_name, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (item_id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           access_token = EXCLUDED.access_token,
           institution_id = EXCLUDED.institution_id,
           institution_name = EXCLUDED.institution_name,
           updated_at = EXCLUDED.updated_at`,
        [
          DEFAULT_GUEST_USER_ID,
          itemId,
          accessToken,
          institutionData.id,
          institutionData.name,
          new Date().toISOString(),
        ]
      );

      // Persist Connected Accounts
      const accountRows = accounts.map((acc) =>
        mapConnectedAccountToInsert(acc, DEFAULT_GUEST_USER_ID, itemId)
      );

      for (const row of accountRows) {
        await dbClient.query(
          `INSERT INTO accounts (
             id, user_id, item_id, name, official_name, mask, type, subtype,
             available_balance, current_balance, iso_currency_code,
             institution_id, institution_name, connected_at, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id) DO UPDATE SET
             user_id = EXCLUDED.user_id,
             item_id = EXCLUDED.item_id,
             name = EXCLUDED.name,
             official_name = EXCLUDED.official_name,
             mask = EXCLUDED.mask,
             type = EXCLUDED.type,
             subtype = EXCLUDED.subtype,
             available_balance = EXCLUDED.available_balance,
             current_balance = EXCLUDED.current_balance,
             iso_currency_code = EXCLUDED.iso_currency_code,
             institution_id = EXCLUDED.institution_id,
             institution_name = EXCLUDED.institution_name,
             connected_at = EXCLUDED.connected_at,
             updated_at = EXCLUDED.updated_at`,
          [
            row.id,
            row.user_id,
            row.item_id,
            row.name,
            row.official_name,
            row.mask,
            row.type,
            row.subtype,
            row.available_balance,
            row.current_balance,
            row.iso_currency_code,
            row.institution_id,
            row.institution_name,
            row.connected_at,
            row.updated_at,
          ]
        );
      }

      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      console.error('Error persisting to PostgreSQL:', dbError);
    } finally {
      dbClient.release();
    }

    return NextResponse.json({
      success: true,
      item_id: itemId,
      institution: institutionData,
      accounts,
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

    console.error('Error exchanging Plaid public token:', errorObj?.response?.data || errorObj?.message || error);
    const plaidData = errorObj?.response?.data;
    return NextResponse.json(
      {
        error: plaidData?.error_message || errorObj?.message || 'Failed to exchange public token',
        code: plaidData?.error_code || 'EXCHANGE_TOKEN_FAILED',
        display_message: plaidData?.display_message || null,
      },
      { status: 500 }
    );
  }
}
