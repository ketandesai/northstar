import { NextResponse } from 'next/server';
import { getPlaidConfig } from '@/lib/plaid';

export async function GET() {
  const config = getPlaidConfig();
  return NextResponse.json({
    isConfigured: config.isConfigured,
    environment: config.environment,
    products: config.products,
    countryCodes: config.countryCodes,
  });
}
