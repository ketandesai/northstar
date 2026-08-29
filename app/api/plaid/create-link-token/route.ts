import { NextResponse } from 'next/server';
import { plaidClient, isPlaidConfigured, getPlaidConfig } from '@/lib/plaid';
import { LinkTokenCreateRequest } from 'plaid';

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

    const { products, countryCodes } = getPlaidConfig();
    let body: { userId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const clientUserId = body.userId || `user_${Date.now()}`;

    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: clientUserId,
      },
      client_name: 'Northstar',
      products: products,
      country_codes: countryCodes,
      language: 'en',
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    return NextResponse.json({
      link_token: createTokenResponse.data.link_token,
      expiration: createTokenResponse.data.expiration,
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

    console.error('Error creating Plaid link token:', errorObj?.response?.data || errorObj?.message || error);
    const plaidData = errorObj?.response?.data;
    return NextResponse.json(
      {
        error: plaidData?.error_message || errorObj?.message || 'Failed to create link token',
        code: plaidData?.error_code || 'LINK_TOKEN_CREATE_FAILED',
        display_message: plaidData?.display_message || null,
      },
      { status: 500 }
    );
  }
}
