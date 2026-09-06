import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const plaidClientId = process.env.PLAID_CLIENT_ID || '';
const plaidEnv = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments;
const plaidSecret = plaidEnv === 'sandbox' ? process.env.PLAID_SECRET_SANDBOX : process.env.PLAID_SECRET_PRODUCTION;

export const isPlaidConfigured = Boolean(
  plaidClientId &&
  plaidSecret &&
  plaidClientId !== 'your_plaid_client_id' &&
  plaidSecret !== 'your_plaid_secret'
);

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': plaidClientId,
      'PLAID-SECRET': plaidSecret,
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export function getPlaidConfig() {
  const productsRaw = (process.env.PLAID_PRODUCTS || 'auth,transactions').split(',');
  const products = productsRaw.map((p) => p.trim() as Products);

  const countryCodesRaw = (process.env.PLAID_COUNTRY_CODES || 'US').split(',');
  const countryCodes = countryCodesRaw.map((c) => c.trim() as CountryCode);

  return {
    isConfigured: isPlaidConfigured,
    environment: plaidEnv,
    products,
    countryCodes,
  };
}
