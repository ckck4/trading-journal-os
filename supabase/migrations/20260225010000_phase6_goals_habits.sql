-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_type text NOT NULL DEFAULT 'performance'
    CHECK (goal_type IN ('performance', 'consistency', 'financial', 'custom')),
  metric text,
  unit text,
  target_value numeric(10,2) NOT NULL,
  current_value numeric(10,2) NOT NULL DEFAULT 0,
  deadline date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  category text NOT NULL DEFAULT 'preparation',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habit completions (one row per completed habit per date)
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own habit_completions" ON habit_completions
  FOR ALL USING (auth.uid() = user_id);
