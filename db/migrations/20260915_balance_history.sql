-- Northstar Finance: Balance History Migration
-- Stores a daily snapshot of account balances per account for historical tracking.

-- 4. Balance History Table
CREATE TABLE IF NOT EXISTS public.balance_history (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    snapshot_date DATE NOT NULL,
    available_balance NUMERIC(14, 2),
    current_balance NUMERIC(14, 2),
    iso_currency_code TEXT NOT NULL DEFAULT 'USD',
    source TEXT NOT NULL DEFAULT 'plaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- One snapshot per account per day keeps the daily cron idempotent
-- (re-running the same day updates the existing snapshot instead of duplicating).
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_history_account_date
    ON public.balance_history(account_id, snapshot_date);

-- Performance Indexes for per-user historical queries / charts
CREATE INDEX IF NOT EXISTS idx_balance_history_user_date
    ON public.balance_history(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_balance_history_account_id
    ON public.balance_history(account_id);
