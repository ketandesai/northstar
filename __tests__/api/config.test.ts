import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/plaid/config/route';

describe('/api/plaid/config', () => {
  it('returns configuration status and environment details', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('isConfigured');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('countryCodes');
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.countryCodes)).toBe(true);
  });
});
