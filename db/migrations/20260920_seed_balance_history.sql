-- Northstar Finance: Seed balance_history demo data
-- Generates ~365 days of daily snapshots for the two demo accounts used by
-- the "Preview Demo Accounts" flow (components/PlaidSetupBanner.tsx).
--
-- Idempotent: every INSERT uses ON CONFLICT ... DO NOTHING so replaying this
-- file (the `migrate` service re-runs all migrations on startup) is safe and
-- never overwrites real data written by the Plaid sync cron.

-- 1. Ensure the demo accounts exist (creates them on a fresh DB, never
--    modifies existing rows such as accounts already added via the demo button).
INSERT INTO public.accounts (
  id, user_id, name, official_name, mask, type, subtype,
  iso_currency_code, institution_id, institution_name
)
VALUES
  (
    'acc_demo_checking_01',
    '00000000-0000-0000-0000-000000000000',
    'Plaid Gold Standard Checking',
    'Plaid Gold Standard Checking 01',
    '0000',
    'depository',
    'checking',
    'USD',
    'ins_chase',
    'Chase Bank (Sandbox Demo)'
  ),
  (
    'acc_demo_savings_02',
    '00000000-0000-0000-0000-000000000000',
    'Plaid High Yield Savings',
    'Plaid Platinum Savings Account',
    '1111',
    'depository',
    'savings',
    'USD',
    'ins_chase',
    'Chase Bank (Sandbox Demo)'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill 365 days of daily snapshots (ending today) for each demo account.
--    Balances trend gently upward to end exactly at the accounts' current
--    demo values, so the chart's latest point matches the dashboard totals.
INSERT INTO public.balance_history (
  account_id, user_id, snapshot_date, available_balance, current_balance,
  iso_currency_code, source
)
SELECT
  d.account_id,
  '00000000-0000-0000-0000-000000000000',
  (current_date - s.days_back)::date,
  round((d.day_0_balance - s.days_back * d.slope - (s.days_back % 7) * d.wiggle)::numeric, 2),
  round((d.day_0_balance - s.days_back * d.slope - (s.days_back % 7) * d.wiggle)::numeric, 2),
  'USD',
  'seed'
FROM (
  SELECT generate_series(0, 364)::int AS days_back
) s
CROSS JOIN (
  VALUES
    ('acc_demo_checking_01'::text, 1250.75::numeric, 0.9::numeric, 2.4::numeric),
    ('acc_demo_savings_02'::text, 15420.50::numeric, 6.8::numeric, 8.1::numeric)
) AS d(account_id, day_0_balance, slope, wiggle)
ON CONFLICT (account_id, snapshot_date) DO NOTHING;