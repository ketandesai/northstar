import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lookupHomeValuation, generateSimulatedValuation } from '@/lib/home-valuation';

describe('home-valuation service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('generateSimulatedValuation', () => {
    it('produces deterministic output for the same address', () => {
      const addr = '742 Evergreen Terrace, Springfield, OR 97477';
      const val1 = generateSimulatedValuation(addr);
      const val2 = generateSimulatedValuation(addr);

      expect(val1.estimatedValue).toBe(val2.estimatedValue);
      expect(val1.priceRangeLow).toBe(val2.priceRangeLow);
      expect(val1.priceRangeHigh).toBe(val2.priceRangeHigh);
      expect(val1.bedrooms).toBe(val2.bedrooms);
      expect(val1.bathrooms).toBe(val2.bathrooms);
      expect(val1.squareFootage).toBe(val2.squareFootage);
      expect(val1.provider).toBe('mock');
      expect(val1.isSimulated).toBe(true);
    });

    it('produces different estimates for different addresses', () => {
      const val1 = generateSimulatedValuation('100 Main St, Austin, TX');
      const val2 = generateSimulatedValuation('999 Ocean Blvd, Miami, FL');

      expect(val1.estimatedValue).not.toBe(val2.estimatedValue);
    });
  });

  describe('lookupHomeValuation', () => {
    it('throws when address is missing or empty', async () => {
      await expect(lookupHomeValuation('')).rejects.toThrow(/valid property address/i);
      await expect(lookupHomeValuation('   ')).rejects.toThrow(/valid property address/i);
      await expect(lookupHomeValuation('ab')).rejects.toThrow(/valid property address/i);
    });

    it('falls back to simulation when RENTCAST_API_KEY is not configured', async () => {
      delete process.env.RENTCAST_API_KEY;
      const result = await lookupHomeValuation('1600 Pennsylvania Avenue, Washington, DC');

      expect(result.provider).toBe('mock');
      expect(result.isSimulated).toBe(true);
      expect(result.estimatedValue).toBeGreaterThan(0);
      expect(result.priceRangeLow).toBeLessThanOrEqual(result.estimatedValue);
      expect(result.priceRangeHigh).toBeGreaterThanOrEqual(result.estimatedValue);
    });

    it('calls RentCast API when RENTCAST_API_KEY is set', async () => {
      process.env.RENTCAST_API_KEY = 'test-api-key';

      const mockRentCastResponse = {
        price: 550000,
        priceRangeLow: 520000,
        priceRangeHigh: 580000,
        currency: 'USD',
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2400,
        propertyType: 'Single Family',
        formattedAddress: '5500 Grand Lake Dr, San Antonio, TX 78244',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockRentCastResponse,
      } as Response);

      const result = await lookupHomeValuation('5500 Grand Lake Dr, San Antonio, TX 78244');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.rentcast.io/v1/avm/value?address=5500%20Grand%20Lake%20Dr%2C%20San%20Antonio%2C%20TX%2078244',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Api-Key': 'test-api-key',
          },
        }
      );

      expect(result.provider).toBe('rentcast');
      expect(result.isSimulated).toBe(false);
      expect(result.estimatedValue).toBe(550000);
      expect(result.priceRangeLow).toBe(520000);
      expect(result.priceRangeHigh).toBe(580000);
      expect(result.bedrooms).toBe(4);
      expect(result.bathrooms).toBe(3);
      expect(result.squareFootage).toBe(2400);
      expect(result.propertyType).toBe('Single Family');
      expect(result.formattedAddress).toBe('5500 Grand Lake Dr, San Antonio, TX 78244');
    });

    it('throws error when RentCast returns 404', async () => {
      process.env.RENTCAST_API_KEY = 'test-api-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Property address could not be found.' }),
      } as Response);

      await expect(
        lookupHomeValuation('Invalid Fake Street, Nowhere, ZZ 00000')
      ).rejects.toThrow('Property address could not be found.');
    });

    it('falls back to simulation when RentCast returns 401 unauthorized', async () => {
      process.env.RENTCAST_API_KEY = 'invalid-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Unauthorized API Key' }),
      } as Response);

      const result = await lookupHomeValuation('123 Elm St, Dallas, TX');
      expect(result.isSimulated).toBe(true);
      expect(result.provider).toBe('mock');
    });
  });
});
