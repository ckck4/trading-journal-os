-- Confluences (defined per strategy)
CREATE TABLE IF NOT EXISTS confluences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  name text NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 1.0,
  category text NOT NULL DEFAULT 'Execution'
    CHECK (category IN (
      'Risk Management','Execution','Discipline',
      'Strategy','Efficiency','Custom'
    )),
  created_at timestamptz DEFAULT now()
);

-- Trade confluences (which confluences were present for a trade)
CREATE TABLE IF NOT EXISTS trade_confluences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  confluence_id uuid NOT NULL REFERENCES confluences(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trade_id, confluence_id)
);

-- Trade grades
CREATE TABLE IF NOT EXISTS trade_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  grade text NOT NULL CHECK (grade IN ('A+','A','B+','B','B-','C')),
  risk_management_score numeric(5,2),
  execution_score numeric(5,2),
  discipline_score numeric(5,2),
  strategy_score numeric(5,2),
  efficiency_score numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add grade to trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS grade text
  CHECK (grade IN ('A+','A','B+','B','B-','C'));

-- RLS
ALTER TABLE confluences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_confluences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own confluences" ON confluences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own trade_confluences" ON trade_confluences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own trade_grades" ON trade_grades
  FOR ALL USING (auth.uid() = user_id);
