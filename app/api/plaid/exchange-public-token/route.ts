import { NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured } from '@/lib/plaid';

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
      institution: institution || {
        id: accountsResponse.data.item.institution_id || 'unknown',
        name: 'Connected Bank',
      },
    }));

    return NextResponse.json({
      success: true,
      item_id: itemId,
      institution: institution || {
        id: accountsResponse.data.item.institution_id || 'unknown',
        name: 'Connected Bank',
      },
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
