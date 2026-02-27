-- Daily routine check-ins
CREATE TABLE IF NOT EXISTS routine_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  followed_routine boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- RLS
ALTER TABLE routine_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own routine_checkins" ON routine_checkins
  FOR ALL USING (auth.uid() = user_id);

-- Discipline settings (add to finance_settings)
ALTER TABLE finance_settings
ADD COLUMN IF NOT EXISTS discipline_weights jsonb
DEFAULT '{"grade_weight": 70, "routine_weight": 30}';
