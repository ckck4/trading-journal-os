-- ============================================================
-- Trading Journal OS — Row-Level Security Policies
-- Applied to all 26 tables in the public schema.
--
-- Principles:
--   1. Every table has RLS enabled (no exceptions)
--   2. Tables with user_id: owner can SELECT/INSERT/UPDATE/DELETE own rows
--   3. Child tables without user_id: ownership checked via parent join
--   4. auto_set_user_id() trigger ensures user_id is always set to auth.uid()
--   5. Service role (SUPABASE_SERVICE_ROLE_KEY) bypasses ALL RLS
-- ============================================================

-- -----------------------------------------------------------
-- 0. Helper: auto-set user_id on INSERT
--    Prevents clients from forging user_id. If the column exists
--    on the table, this trigger overwrites it with auth.uid().
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- Macro: Creates standard owner-based policies + auto user_id trigger
-- We apply this manually per table below.
-- -----------------------------------------------------------

-- ============================================================
-- 1. users  (special: id = auth.uid(), not user_id)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY users_delete ON public.users
  FOR DELETE TO authenticated
  USING (id = auth.uid());


-- ============================================================
-- 2. accounts
-- ============================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_select ON public.accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY accounts_insert ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY accounts_update ON public.accounts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY accounts_delete ON public.accounts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_accounts_set_user_id
  BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 3. instruments
-- ============================================================
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY instruments_select ON public.instruments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY instruments_insert ON public.instruments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY instruments_update ON public.instruments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY instruments_delete ON public.instruments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_instruments_set_user_id
  BEFORE INSERT ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 3b. account_instrument_fees (child of accounts + instruments)
-- ============================================================
ALTER TABLE public.account_instrument_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY aif_select ON public.account_instrument_fees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_instrument_fees.account_id
      AND accounts.user_id = auth.uid()
  ));
CREATE POLICY aif_insert ON public.account_instrument_fees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_instrument_fees.account_id
      AND accounts.user_id = auth.uid()
  ));
CREATE POLICY aif_update ON public.account_instrument_fees
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_instrument_fees.account_id
      AND accounts.user_id = auth.uid()
  ));
CREATE POLICY aif_delete ON public.account_instrument_fees
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_instrument_fees.account_id
      AND accounts.user_id = auth.uid()
  ));


-- ============================================================
-- 4. sessions
-- ============================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select ON public.sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY sessions_insert ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY sessions_update ON public.sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY sessions_delete ON public.sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_sessions_set_user_id
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 5. strategies
-- ============================================================
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategies_select ON public.strategies
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY strategies_insert ON public.strategies
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY strategies_update ON public.strategies
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY strategies_delete ON public.strategies
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_strategies_set_user_id
  BEFORE INSERT ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 5b. strategy_auto_assign_rules (child of strategies)
-- ============================================================
ALTER TABLE public.strategy_auto_assign_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY saar_select ON public.strategy_auto_assign_rules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_auto_assign_rules.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY saar_insert ON public.strategy_auto_assign_rules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_auto_assign_rules.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY saar_update ON public.strategy_auto_assign_rules
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_auto_assign_rules.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY saar_delete ON public.strategy_auto_assign_rules
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_auto_assign_rules.strategy_id
      AND strategies.user_id = auth.uid()
  ));


-- ============================================================
-- 5c. strategy_confluences (child of strategies)
-- ============================================================
ALTER TABLE public.strategy_confluences ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_select ON public.strategy_confluences
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_confluences.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sc_insert ON public.strategy_confluences
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_confluences.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sc_update ON public.strategy_confluences
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_confluences.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sc_delete ON public.strategy_confluences
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_confluences.strategy_id
      AND strategies.user_id = auth.uid()
  ));


-- ============================================================
-- 5d. strategy_versions (child of strategies)
-- ============================================================
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sv_select ON public.strategy_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_versions.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sv_insert ON public.strategy_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_versions.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sv_update ON public.strategy_versions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_versions.strategy_id
      AND strategies.user_id = auth.uid()
  ));
CREATE POLICY sv_delete ON public.strategy_versions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_versions.strategy_id
      AND strategies.user_id = auth.uid()
  ));


-- ============================================================
-- 6. tags
-- ============================================================
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON public.tags
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tags_insert ON public.tags
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tags_update ON public.tags
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tags_delete ON public.tags
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_tags_set_user_id
  BEFORE INSERT ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 7. import_batches
-- ============================================================
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_batches_select ON public.import_batches
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY import_batches_insert ON public.import_batches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY import_batches_update ON public.import_batches
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY import_batches_delete ON public.import_batches
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_import_batches_set_user_id
  BEFORE INSERT ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 8. fills
-- ============================================================
ALTER TABLE public.fills ENABLE ROW LEVEL SECURITY;

CREATE POLICY fills_select ON public.fills
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY fills_insert ON public.fills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY fills_update ON public.fills
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY fills_delete ON public.fills
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_fills_set_user_id
  BEFORE INSERT ON public.fills
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 9. trades
-- ============================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_select ON public.trades
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY trades_insert ON public.trades
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY trades_update ON public.trades
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY trades_delete ON public.trades
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_trades_set_user_id
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 10. trade_tags (child of trades + tags)
-- ============================================================
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tt_select ON public.trade_tags
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_tags.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY tt_insert ON public.trade_tags
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_tags.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY tt_delete ON public.trade_tags
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_tags.trade_id
      AND trades.user_id = auth.uid()
  ));
-- No UPDATE policy: trade_tags is a junction table (delete + re-insert)


-- ============================================================
-- 11. trade_screenshots (child of trades)
-- ============================================================
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY ts_select ON public.trade_screenshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_screenshots.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY ts_insert ON public.trade_screenshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_screenshots.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY ts_update ON public.trade_screenshots
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_screenshots.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY ts_delete ON public.trade_screenshots
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_screenshots.trade_id
      AND trades.user_id = auth.uid()
  ));


-- ============================================================
-- 12. grading_rubrics
-- ============================================================
ALTER TABLE public.grading_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY gr_select ON public.grading_rubrics
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY gr_insert ON public.grading_rubrics
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY gr_update ON public.grading_rubrics
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY gr_delete ON public.grading_rubrics
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_grading_rubrics_set_user_id
  BEFORE INSERT ON public.grading_rubrics
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 12b. grading_rubric_categories (child of grading_rubrics)
-- ============================================================
ALTER TABLE public.grading_rubric_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY grc_select ON public.grading_rubric_categories
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grading_rubrics
    WHERE grading_rubrics.id = grading_rubric_categories.rubric_id
      AND grading_rubrics.user_id = auth.uid()
  ));
CREATE POLICY grc_insert ON public.grading_rubric_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grading_rubrics
    WHERE grading_rubrics.id = grading_rubric_categories.rubric_id
      AND grading_rubrics.user_id = auth.uid()
  ));
CREATE POLICY grc_update ON public.grading_rubric_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grading_rubrics
    WHERE grading_rubrics.id = grading_rubric_categories.rubric_id
      AND grading_rubrics.user_id = auth.uid()
  ));
CREATE POLICY grc_delete ON public.grading_rubric_categories
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grading_rubrics
    WHERE grading_rubrics.id = grading_rubric_categories.rubric_id
      AND grading_rubrics.user_id = auth.uid()
  ));


-- ============================================================
-- 13. trade_grades (child of trades)
-- ============================================================
ALTER TABLE public.trade_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY tg_select ON public.trade_grades
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_grades.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY tg_insert ON public.trade_grades
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_grades.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY tg_update ON public.trade_grades
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_grades.trade_id
      AND trades.user_id = auth.uid()
  ));
CREATE POLICY tg_delete ON public.trade_grades
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trades
    WHERE trades.id = trade_grades.trade_id
      AND trades.user_id = auth.uid()
  ));


-- ============================================================
-- 14. grade_rollups
-- ============================================================
ALTER TABLE public.grade_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY gru_select ON public.grade_rollups
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY gru_insert ON public.grade_rollups
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY gru_update ON public.grade_rollups
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY gru_delete ON public.grade_rollups
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_grade_rollups_set_user_id
  BEFORE INSERT ON public.grade_rollups
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 15. daily_summaries
-- ============================================================
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ds_select ON public.daily_summaries
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ds_insert ON public.daily_summaries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ds_update ON public.daily_summaries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ds_delete ON public.daily_summaries
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_daily_summaries_set_user_id
  BEFORE INSERT ON public.daily_summaries
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 16. prop_templates
-- ============================================================
ALTER TABLE public.prop_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY pt_select ON public.prop_templates
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY pt_insert ON public.prop_templates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pt_update ON public.prop_templates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY pt_delete ON public.prop_templates
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_prop_templates_set_user_id
  BEFORE INSERT ON public.prop_templates
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 16b. prop_template_versions (child of prop_templates)
-- ============================================================
ALTER TABLE public.prop_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ptv_select ON public.prop_template_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prop_templates
    WHERE prop_templates.id = prop_template_versions.template_id
      AND prop_templates.user_id = auth.uid()
  ));
CREATE POLICY ptv_insert ON public.prop_template_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prop_templates
    WHERE prop_templates.id = prop_template_versions.template_id
      AND prop_templates.user_id = auth.uid()
  ));
CREATE POLICY ptv_update ON public.prop_template_versions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prop_templates
    WHERE prop_templates.id = prop_template_versions.template_id
      AND prop_templates.user_id = auth.uid()
  ));
CREATE POLICY ptv_delete ON public.prop_template_versions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prop_templates
    WHERE prop_templates.id = prop_template_versions.template_id
      AND prop_templates.user_id = auth.uid()
  ));


-- ============================================================
-- 17. prop_evaluations
-- ============================================================
ALTER TABLE public.prop_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY pe_select ON public.prop_evaluations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY pe_insert ON public.prop_evaluations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pe_update ON public.prop_evaluations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY pe_delete ON public.prop_evaluations
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_prop_evaluations_set_user_id
  BEFORE INSERT ON public.prop_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 18. payouts
-- ============================================================
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY payouts_select ON public.payouts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY payouts_insert ON public.payouts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY payouts_update ON public.payouts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY payouts_delete ON public.payouts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_payouts_set_user_id
  BEFORE INSERT ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 19. expense_categories
-- ============================================================
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY ec_select ON public.expense_categories
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ec_insert ON public.expense_categories
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ec_update ON public.expense_categories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ec_delete ON public.expense_categories
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_expense_categories_set_user_id
  BEFORE INSERT ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 19b. business_entries
-- ============================================================
ALTER TABLE public.business_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY be_select ON public.business_entries
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY be_insert ON public.business_entries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY be_update ON public.business_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY be_delete ON public.business_entries
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_business_entries_set_user_id
  BEFORE INSERT ON public.business_entries
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 20. goals
-- ============================================================
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select ON public.goals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY goals_insert ON public.goals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY goals_update ON public.goals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY goals_delete ON public.goals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_goals_set_user_id
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 21. routines
-- ============================================================
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY routines_select ON public.routines
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY routines_insert ON public.routines
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY routines_update ON public.routines
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY routines_delete ON public.routines
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_routines_set_user_id
  BEFORE INSERT ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 21b. routine_items (child of routines)
-- ============================================================
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ri_select ON public.routine_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.routines
    WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
  ));
CREATE POLICY ri_insert ON public.routine_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.routines
    WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
  ));
CREATE POLICY ri_update ON public.routine_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.routines
    WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
  ));
CREATE POLICY ri_delete ON public.routine_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.routines
    WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
  ));


-- ============================================================
-- 21c. routine_completions
-- ============================================================
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_select ON public.routine_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY rc_insert ON public.routine_completions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY rc_update ON public.routine_completions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY rc_delete ON public.routine_completions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_routine_completions_set_user_id
  BEFORE INSERT ON public.routine_completions
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 22. ai_insights
-- ============================================================
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_select ON public.ai_insights
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ai_insert ON public.ai_insights
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ai_update ON public.ai_insights
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ai_delete ON public.ai_insights
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_ai_insights_set_user_id
  BEFORE INSERT ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 23. leak_signals
-- ============================================================
ALTER TABLE public.leak_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY ls_select ON public.leak_signals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ls_insert ON public.leak_signals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ls_update ON public.leak_signals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ls_delete ON public.leak_signals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_leak_signals_set_user_id
  BEFORE INSERT ON public.leak_signals
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 24. dashboard_layouts
-- ============================================================
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY dl_select ON public.dashboard_layouts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY dl_insert ON public.dashboard_layouts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY dl_update ON public.dashboard_layouts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY dl_delete ON public.dashboard_layouts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_dashboard_layouts_set_user_id
  BEFORE INSERT ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 25. trading_day_config
-- ============================================================
ALTER TABLE public.trading_day_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tdc_select ON public.trading_day_config
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tdc_insert ON public.trading_day_config
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tdc_update ON public.trading_day_config
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tdc_delete ON public.trading_day_config
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_trading_day_config_set_user_id
  BEFORE INSERT ON public.trading_day_config
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- 25b. trading_day_exceptions (child of trading_day_config)
-- ============================================================
ALTER TABLE public.trading_day_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tde_select ON public.trading_day_exceptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trading_day_config
    WHERE trading_day_config.id = trading_day_exceptions.config_id
      AND trading_day_config.user_id = auth.uid()
  ));
CREATE POLICY tde_insert ON public.trading_day_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trading_day_config
    WHERE trading_day_config.id = trading_day_exceptions.config_id
      AND trading_day_config.user_id = auth.uid()
  ));
CREATE POLICY tde_update ON public.trading_day_exceptions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trading_day_config
    WHERE trading_day_config.id = trading_day_exceptions.config_id
      AND trading_day_config.user_id = auth.uid()
  ));
CREATE POLICY tde_delete ON public.trading_day_exceptions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trading_day_config
    WHERE trading_day_config.id = trading_day_exceptions.config_id
      AND trading_day_config.user_id = auth.uid()
  ));


-- ============================================================
-- 26. event_log
-- ============================================================
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY el_select ON public.event_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY el_insert ON public.event_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- No UPDATE or DELETE on event_log: audit trail is append-only.

CREATE TRIGGER trg_event_log_set_user_id
  BEFORE INSERT ON public.event_log
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_user_id();


-- ============================================================
-- VERIFICATION QUERY: confirm RLS is enabled on all tables
-- Run this after applying — should return 26 rows, all TRUE.
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
