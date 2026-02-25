-- Strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'testing', 'retired')),
  entry_rules text,
  invalidation_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure we add new columns if the table was created previously with a different schema.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'status') THEN
        ALTER TABLE strategies ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'testing', 'retired'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'entry_rules') THEN
        ALTER TABLE strategies ADD COLUMN entry_rules text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'invalidation_conditions') THEN
        ALTER TABLE strategies ADD COLUMN invalidation_conditions text;
    END IF;
END $$;

-- Add strategy_id to trades if it doesn't exist
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS strategy_id uuid 
REFERENCES strategies(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'strategies' AND policyname = 'users own strategies'
    ) THEN
        CREATE POLICY "users own strategies" ON strategies
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
