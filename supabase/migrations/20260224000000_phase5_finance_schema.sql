-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  category text NOT NULL,
  vendor text,
  description text,
  date date NOT NULL,
  tags text[] DEFAULT '{}',
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text,
  amount numeric(10,2) NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly','weekly')),
  next_billing_date date,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','received','rejected')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Ledger entries (manual entries + auto-derived marker rows)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income','expense','payout','funding')),
  amount numeric(10,2) NOT NULL,
  description text,
  category text,
  date date NOT NULL,
  source text CHECK (source IN ('manual','trade','expense','payout')) DEFAULT 'manual',
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Finance settings (one row per user)
CREATE TABLE IF NOT EXISTS finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  fiscal_year_start integer NOT NULL DEFAULT 1 
    CHECK (fiscal_year_start BETWEEN 1 AND 12),
  vendor_presets text[] DEFAULT '{}',
  custom_tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own payouts" ON payouts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own ledger_entries" ON ledger_entries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own finance_settings" ON finance_settings
  FOR ALL USING (auth.uid() = user_id);
