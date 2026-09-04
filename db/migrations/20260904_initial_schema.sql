-- Northstar Finance: PostgreSQL Initial Schema Migration
-- Sets up profiles, plaid_items, and accounts tables

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default guest profile for single-user/guest mode
INSERT INTO public.profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'guest@northstar.local', 'Guest User')
ON CONFLICT (id) DO NOTHING;

-- 2. Plaid Items Table (stores sensitive access_token on server)
CREATE TABLE IF NOT EXISTS public.plaid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    item_id TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Connected Bank Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY, -- Plaid account_id or custom ID
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
    item_id TEXT REFERENCES public.plaid_items(item_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    official_name TEXT,
    mask TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    available_balance NUMERIC(14, 2),
    current_balance NUMERIC(14, 2),
    iso_currency_code TEXT NOT NULL DEFAULT 'USD',
    institution_id TEXT,
    institution_name TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_item_id ON public.accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON public.plaid_items(user_id);
