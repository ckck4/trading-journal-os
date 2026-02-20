-- Add profit_target_override column to prop_evaluations
-- Allows per-account override of the template's profitTarget threshold

ALTER TABLE prop_evaluations
  ADD COLUMN IF NOT EXISTS profit_target_override numeric(14, 2);
