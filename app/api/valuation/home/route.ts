import { NextResponse } from 'next/server';
import { lookupHomeValuation } from '@/lib/home-valuation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address || address.trim() === '') {
      return NextResponse.json(
        {
          error: 'Property address is required.',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    const valuation = await lookupHomeValuation(address);

    return NextResponse.json({
      success: true,
      valuation,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error handling home valuation lookup:', err);

    const isClientError =
      err.message.includes('valid property address') ||
      err.message.includes('could not be found');

    return NextResponse.json(
      {
        error: err.message || 'Failed to look up home valuation.',
        code: isClientError ? 'VALUATION_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
