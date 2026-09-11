import { HomeValuationResult } from '@/types/account';

/**
 * Computes a deterministic integer hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a realistic, deterministic simulated property valuation
 * based on the address string when RENTCAST_API_KEY is not configured.
 */
export function generateSimulatedValuation(address: string): HomeValuationResult {
  const hash = hashString(address.toLowerCase().trim());

  // Value between $325,000 and $1,250,000 rounded to nearest $5,000
  const baseValue = 325000 + (hash % 185) * 5000;
  const spread = 0.05 + ((hash >> 2) % 4) * 0.01; // 5% to 8% spread
  const priceRangeLow = Math.round((baseValue * (1 - spread)) / 1000) * 1000;
  const priceRangeHigh = Math.round((baseValue * (1 + spread)) / 1000) * 1000;

  const bedrooms = 2 + (hash % 4); // 2 - 5
  const halfBaths = ((hash >> 3) % 2) * 0.5;
  const bathrooms = 1.5 + ((hash >> 4) % 3) + halfBaths; // 1.5 - 4.5
  const squareFootage = 1200 + ((hash >> 2) % 50) * 50; // 1200 - 3650

  const propertyTypes = ['Single Family', 'Townhouse', 'Condo', 'Single Family'];
  const propertyType = propertyTypes[(hash >> 5) % propertyTypes.length];

  return {
    address: address.trim(),
    formattedAddress: address.trim(),
    estimatedValue: baseValue,
    priceRangeLow,
    priceRangeHigh,
    currency: 'USD',
    bedrooms,
    bathrooms,
    squareFootage,
    propertyType,
    valuationDate: new Date().toISOString(),
    provider: 'mock',
    isSimulated: true,
  };
}

/**
 * Looks up property valuation by address.
 * If RENTCAST_API_KEY is configured in the environment, calls the RentCast AVM API.
 * Otherwise, falls back to deterministic simulation.
 */
export async function lookupHomeValuation(address: string): Promise<HomeValuationResult> {
  const trimmed = address?.trim();
  if (!trimmed || trimmed.length < 3) {
    throw new Error('Please enter a valid property address.');
  }

  const apiKey = process.env.RENTCAST_API_KEY?.trim();

  if (!apiKey) {
    return generateSimulatedValuation(trimmed);
  }

  const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Api-Key': apiKey,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new Error(errorData.message || 'Property address could not be found.');
      }
      if (res.status === 401 || res.status === 403) {
        console.warn('Invalid or unauthorized RENTCAST_API_KEY, falling back to simulated valuation.');
        return generateSimulatedValuation(trimmed);
      }
      throw new Error(
        errorData.message || `RentCast API returned error ${res.status}: ${res.statusText}`
      );
    }

    const data = await res.json();
    if (typeof data.price !== 'number' || data.price <= 0) {
      throw new Error('Unable to retrieve an estimated market value for this address.');
    }

    return {
      address: trimmed,
      formattedAddress: data.formattedAddress || trimmed,
      estimatedValue: data.price,
      priceRangeLow: typeof data.priceRangeLow === 'number' ? data.priceRangeLow : null,
      priceRangeHigh: typeof data.priceRangeHigh === 'number' ? data.priceRangeHigh : null,
      currency: data.currency || 'USD',
      bedrooms: typeof data.bedrooms === 'number' ? data.bedrooms : null,
      bathrooms: typeof data.bathrooms === 'number' ? data.bathrooms : null,
      squareFootage: typeof data.squareFootage === 'number' ? data.squareFootage : null,
      propertyType: data.propertyType || null,
      valuationDate: new Date().toISOString(),
      provider: 'rentcast',
      isSimulated: false,
    };
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('valid property address') || err.message.includes('could not be found'))) {
      throw err;
    }
    console.error('RentCast valuation request failed:', err);
    // If the external network failed and it's not a user error, fallback to simulated estimate
    return generateSimulatedValuation(trimmed);
  }
}
