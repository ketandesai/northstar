-- Northstar Finance: Add user-editable account category
-- Stores the user's card grouping (cash | investment | retirement | property | credit | other).
-- NULL means "derive from type/subtype" via getEffectiveCategory on read.

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS category TEXT;