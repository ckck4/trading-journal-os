-- ============================================================
-- Trading Journal OS — Database Schema
-- Target: PostgreSQL 15+
-- ============================================================

-- -----------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------
-- 1. Users & Authentication
-- -----------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    password_hash   TEXT NOT NULL,
    timezone        VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 2. Accounts (trading accounts)
-- -----------------------------------------------------------
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    external_id     VARCHAR(255),           -- account identifier from broker CSV
    broker          VARCHAR(50) NOT NULL DEFAULT 'Tradeovate',
    starting_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, external_id)
);

-- -----------------------------------------------------------
-- 3. Instruments
-- -----------------------------------------------------------
CREATE TABLE instruments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    root_symbol     VARCHAR(10) NOT NULL,       -- e.g. MNQ
    display_name    VARCHAR(50) NOT NULL,        -- e.g. Micro Nasdaq
    tick_size       NUMERIC(10,6) NOT NULL,      -- e.g. 0.25
    tick_value      NUMERIC(10,4) NOT NULL,      -- e.g. 0.50
    commission_per_side NUMERIC(8,4) NOT NULL DEFAULT 0, -- e.g. 0.62
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_micro        BOOLEAN NOT NULL DEFAULT TRUE,
    multiplier      NUMERIC(10,4) NOT NULL DEFAULT 1,   -- point-to-dollar multiplier
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, root_symbol)
);

-- Per-account commission overrides
CREATE TABLE account_instrument_fees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    commission_per_side NUMERIC(8,4) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, instrument_id)
);

-- -----------------------------------------------------------
-- 4. Sessions
-- -----------------------------------------------------------
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,        -- e.g. "Pre-Market", "RTH", "Post-Market"
    start_time      TIME NOT NULL,               -- in user's configured timezone
    end_time        TIME NOT NULL,
    timezone        VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- -----------------------------------------------------------
-- 5. Strategies
-- -----------------------------------------------------------
CREATE TABLE strategies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Strategy-instrument-session auto-suggest mapping
CREATE TABLE strategy_auto_assign_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    instrument_id   UUID REFERENCES instruments(id) ON DELETE SET NULL,   -- null = any
    session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,     -- null = any
    priority        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strategy confluences (checklist template)
CREATE TABLE strategy_confluences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    label           VARCHAR(200) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strategy version history
CREATE TABLE strategy_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    snapshot_json   JSONB NOT NULL,     -- full snapshot of strategy + confluences at this version
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_note     TEXT
);

-- -----------------------------------------------------------
-- 6. Tags
-- -----------------------------------------------------------
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    color           VARCHAR(7),                  -- hex color
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- -----------------------------------------------------------
-- 7. Import Batches
-- -----------------------------------------------------------
CREATE TABLE import_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    file_hash       VARCHAR(64),                 -- SHA-256 of entire file
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    total_rows      INT NOT NULL DEFAULT 0,
    new_fills       INT NOT NULL DEFAULT 0,
    duplicate_fills INT NOT NULL DEFAULT 0,
    error_rows      INT NOT NULL DEFAULT 0,
    error_details   JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 8. Fills (source of truth)
-- -----------------------------------------------------------
CREATE TABLE fills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    fill_hash       VARCHAR(64) NOT NULL,        -- SHA-256 of canonical fill fields for dedup

    -- Raw CSV fields (mapped from Tradeovate FILLS CSV)
    raw_fill_id     VARCHAR(100),                -- from CSV `id` column
    raw_order_id    VARCHAR(100),                -- from CSV `orderId` column
    raw_instrument  VARCHAR(200),                -- from CSV `Contract` column (full name + code)
    root_symbol     VARCHAR(10) NOT NULL,        -- from CSV `Product` column (already the root: MNQ, MES, MGC)
    side            VARCHAR(4) NOT NULL,         -- 'BUY' or 'SELL'
    quantity        INT NOT NULL,
    price           NUMERIC(14,6) NOT NULL,
    fill_time       TIMESTAMPTZ NOT NULL,
    commission      NUMERIC(8,4),                -- from CSV or computed
    fee             NUMERIC(8,4) DEFAULT 0,      -- exchange/NFA fees if separate

    -- Derived
    instrument_id   UUID REFERENCES instruments(id),
    trading_day     DATE NOT NULL,               -- computed from fill_time + rollover rule
    trade_id        UUID REFERENCES trades(id) ON DELETE SET NULL,  -- assigned during reconstruction

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, fill_hash)
);

CREATE INDEX idx_fills_user_trading_day ON fills(user_id, trading_day);
CREATE INDEX idx_fills_trade_id ON fills(trade_id);
CREATE INDEX idx_fills_account_id ON fills(account_id);
CREATE INDEX idx_fills_root_symbol ON fills(root_symbol);

-- -----------------------------------------------------------
-- 9. Trades (reconstructed from fills)
-- -----------------------------------------------------------
CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id   UUID REFERENCES instruments(id),
    root_symbol     VARCHAR(10) NOT NULL,

    -- Timing
    trading_day     DATE NOT NULL,
    entry_time      TIMESTAMPTZ NOT NULL,
    exit_time       TIMESTAMPTZ,
    duration_seconds INT,
    session_id      UUID REFERENCES sessions(id),

    -- Position
    side            VARCHAR(5) NOT NULL,         -- 'LONG' or 'SHORT'
    entry_qty       INT NOT NULL,
    exit_qty        INT NOT NULL DEFAULT 0,
    avg_entry_price NUMERIC(14,6) NOT NULL,
    avg_exit_price  NUMERIC(14,6),
    is_open         BOOLEAN NOT NULL DEFAULT TRUE,

    -- P&L
    gross_pnl       NUMERIC(14,2) NOT NULL DEFAULT 0,
    commission_total NUMERIC(10,4) NOT NULL DEFAULT 0,
    fees_total      NUMERIC(10,4) NOT NULL DEFAULT 0,
    net_pnl         NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- R-Multiple
    initial_stop_price NUMERIC(14,6),            -- user-input
    initial_stop_points NUMERIC(10,4),           -- user-input (preferred)
    r_multiple      NUMERIC(8,4),                -- computed: net_pnl / risk

    -- Strategy
    strategy_id     UUID REFERENCES strategies(id) ON DELETE SET NULL,
    strategy_auto   BOOLEAN NOT NULL DEFAULT FALSE,  -- was strategy auto-assigned?

    -- Outcome
    outcome         VARCHAR(10),                 -- 'WIN', 'LOSS', 'BREAKEVEN'

    -- Notes
    notes           TEXT,
    tradingview_link VARCHAR(500),

    -- Grouping
    grouping_method VARCHAR(20) NOT NULL DEFAULT 'flat_to_flat',
    manually_adjusted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_day ON trades(user_id, trading_day);
CREATE INDEX idx_trades_account ON trades(account_id);
CREATE INDEX idx_trades_strategy ON trades(strategy_id);
CREATE INDEX idx_trades_root_symbol ON trades(root_symbol);
CREATE INDEX idx_trades_session ON trades(session_id);

-- -----------------------------------------------------------
-- 10. Trade Tags (many-to-many)
-- -----------------------------------------------------------
CREATE TABLE trade_tags (
    trade_id        UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(trade_id, tag_id)
);

-- -----------------------------------------------------------
-- 11. Trade Screenshots
-- -----------------------------------------------------------
CREATE TABLE trade_screenshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id        UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,               -- storage path (S3 key or local)
    file_size       INT,
    mime_type       VARCHAR(50),
    caption         VARCHAR(200),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 12. Grading Rubrics (configurable)
-- -----------------------------------------------------------
CREATE TABLE grading_rubrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grading_rubric_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rubric_id       UUID NOT NULL REFERENCES grading_rubrics(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- e.g. "Setup", "Execution", "Risk", "Psychology"
    weight          NUMERIC(5,2) NOT NULL DEFAULT 25.0,  -- percentage weight
    max_score       INT NOT NULL DEFAULT 10,
    sort_order      INT NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 13. Trade Grades
-- -----------------------------------------------------------
CREATE TABLE trade_grades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id        UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    rubric_id       UUID NOT NULL REFERENCES grading_rubrics(id),

    -- Per-category scores (stored as JSONB for flexibility)
    category_scores JSONB NOT NULL DEFAULT '[]',
    -- Example: [{"category_id": "...", "score": 8}, ...]

    -- Computed
    numeric_score   NUMERIC(5,2) NOT NULL,       -- weighted composite (0–100)
    letter_grade    VARCHAR(2) NOT NULL,          -- A+, A, A-, B+, ..., F

    -- Confluence checklist results
    confluence_results JSONB DEFAULT '[]',
    -- Example: [{"confluence_id": "...", "checked": true}, ...]

    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trade_id)
);

-- -----------------------------------------------------------
-- 14. Grade Roll-ups (materialized/cached)
-- -----------------------------------------------------------
CREATE TABLE grade_rollups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID REFERENCES accounts(id),   -- null = all accounts
    period_type     VARCHAR(10) NOT NULL,            -- 'daily', 'weekly', 'monthly'
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    avg_numeric     NUMERIC(5,2) NOT NULL,
    avg_letter      VARCHAR(2) NOT NULL,
    trade_count     INT NOT NULL,
    graded_count    INT NOT NULL,
    category_avgs   JSONB DEFAULT '{}',              -- avg per rubric category
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id, period_type, period_start)
);

-- -----------------------------------------------------------
-- 15. Daily Summaries (materialized/cached)
-- -----------------------------------------------------------
CREATE TABLE daily_summaries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id),
    trading_day     DATE NOT NULL,

    -- Metrics
    trade_count     INT NOT NULL DEFAULT 0,
    win_count       INT NOT NULL DEFAULT 0,
    loss_count      INT NOT NULL DEFAULT 0,
    breakeven_count INT NOT NULL DEFAULT 0,
    gross_pnl       NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_pnl         NUMERIC(14,2) NOT NULL DEFAULT 0,
    commission_total NUMERIC(10,4) NOT NULL DEFAULT 0,
    fees_total      NUMERIC(10,4) NOT NULL DEFAULT 0,
    win_rate        NUMERIC(5,2),
    profit_factor   NUMERIC(10,4),
    avg_win         NUMERIC(14,2),
    avg_loss        NUMERIC(14,2),
    largest_win     NUMERIC(14,2),
    largest_loss    NUMERIC(14,2),
    avg_r           NUMERIC(8,4),
    total_r         NUMERIC(10,4),
    max_contracts   INT,

    -- Grade
    avg_grade_numeric NUMERIC(5,2),
    avg_grade_letter VARCHAR(2),

    -- Equity
    cumulative_pnl  NUMERIC(14,2) NOT NULL DEFAULT 0,

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id, trading_day)
);

CREATE INDEX idx_daily_summaries_day ON daily_summaries(user_id, trading_day);

-- -----------------------------------------------------------
-- 16. Prop Firm Templates
-- -----------------------------------------------------------
CREATE TABLE prop_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_name       VARCHAR(100) NOT NULL DEFAULT 'LucidFlex',
    template_name   VARCHAR(100) NOT NULL,       -- e.g. "50K Evaluation"
    version         INT NOT NULL DEFAULT 1,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Evaluation rules (JSONB for flexibility)
    rules_json      JSONB NOT NULL,
    -- Example:
    -- {
    --   "profit_target": 3000,
    --   "max_loss_limit": 2000,
    --   "consistency_max_pct": 50,
    --   "max_minis": 4,
    --   "max_micros": 40,
    --   "flat_by": "16:45",
    --   "trading_resumes": "18:00",
    --   "flat_by_tz": "America/New_York",
    --   "payout": {
    --     "split_pct": 90,
    --     "min_profit_days": 5,
    --     "min_daily_profit": 150,
    --     "min_net_profit": 1,
    --     "min_payout_request": 500,
    --     "max_payout_pct": 50,
    --     "max_payout_cap": 2000,
    --     "max_payouts_before_live": 6
    --   }
    -- }

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prop template version history
CREATE TABLE prop_template_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id     UUID NOT NULL REFERENCES prop_templates(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    rules_json      JSONB NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_note     TEXT
);

-- -----------------------------------------------------------
-- 17. Prop Evaluations (account linked to template)
-- -----------------------------------------------------------
CREATE TABLE prop_evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id),
    template_id     UUID NOT NULL REFERENCES prop_templates(id),
    stage           VARCHAR(30) NOT NULL DEFAULT 'evaluation',  -- evaluation, payout, live
    status          VARCHAR(20) NOT NULL DEFAULT 'active',      -- active, passed, failed, withdrawn
    start_date      DATE NOT NULL,
    end_date        DATE,

    -- Cached rule state
    cumulative_pnl  NUMERIC(14,2) NOT NULL DEFAULT 0,
    max_drawdown    NUMERIC(14,2) NOT NULL DEFAULT 0,
    consistency_pct NUMERIC(5,2),
    days_traded     INT NOT NULL DEFAULT 0,
    violations      JSONB DEFAULT '[]',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 18. Payout Records
-- -----------------------------------------------------------
CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id   UUID NOT NULL REFERENCES prop_evaluations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(14,2) NOT NULL,
    payout_number   INT NOT NULL,                -- 1st, 2nd, ... 6th
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, paid
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at         TIMESTAMPTZ,
    notes           TEXT
);

-- -----------------------------------------------------------
-- 19. Business Ledger
-- -----------------------------------------------------------
CREATE TABLE expense_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- e.g. "Software", "Data Feed", "Education"
    icon            VARCHAR(50),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE business_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type      VARCHAR(10) NOT NULL,        -- 'expense' or 'revenue'
    category_id     UUID REFERENCES expense_categories(id),
    amount          NUMERIC(14,2) NOT NULL,
    description     VARCHAR(255),
    entry_date      DATE NOT NULL,
    is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule VARCHAR(50),                 -- 'monthly', 'yearly', etc.
    source          VARCHAR(50),                 -- 'manual', 'auto_trading_pnl', 'auto_payout'
    reference_id    UUID,                        -- link to trade/payout if auto-generated
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 20. Goals
-- -----------------------------------------------------------
CREATE TABLE goals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    goal_type       VARCHAR(20) NOT NULL,        -- 'performance', 'habit'
    metric          VARCHAR(50) NOT NULL,        -- 'net_pnl', 'win_rate', 'avg_grade', 'routine_completion', etc.
    target_value    NUMERIC(14,4) NOT NULL,
    target_operator VARCHAR(5) NOT NULL DEFAULT '>=',  -- '>=', '<=', '='
    period          VARCHAR(20) NOT NULL,        -- 'daily', 'weekly', 'monthly'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    current_value   NUMERIC(14,4),
    current_streak  INT NOT NULL DEFAULT 0,
    best_streak     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 21. Routines (pre/post-market)
-- -----------------------------------------------------------
CREATE TABLE routines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- e.g. "Pre-Market Routine"
    routine_type    VARCHAR(20) NOT NULL,        -- 'pre_market', 'post_market'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routine_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    label           VARCHAR(200) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routine_completions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    trading_day     DATE NOT NULL,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    items_completed JSONB NOT NULL DEFAULT '[]',  -- [{"item_id": "...", "checked": true}]
    UNIQUE(user_id, routine_id, trading_day)
);

-- -----------------------------------------------------------
-- 22. AI Coach Insights
-- -----------------------------------------------------------
CREATE TABLE ai_insights (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type    VARCHAR(30) NOT NULL,        -- 'daily_summary', 'action_plan', 'premarket_plan', 'yesterday_review'
    trading_day     DATE,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 23. Leak Detector Signals
-- -----------------------------------------------------------
CREATE TABLE leak_signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    signal_type     VARCHAR(50) NOT NULL,        -- 'time_of_day', 'day_of_week', 'session', 'instrument', 'strategy', 'tag'
    dimension_key   VARCHAR(100) NOT NULL,       -- the specific value (e.g. "Friday", "14:00-15:00", "MNQ")
    description     TEXT NOT NULL,               -- human-readable signal
    severity        VARCHAR(10) NOT NULL DEFAULT 'medium',  -- low, medium, high
    metrics         JSONB NOT NULL,              -- supporting data: win_rate, avg_loss, trade_count, etc.
    trade_ids       UUID[] NOT NULL DEFAULT '{}', -- underlying trade IDs
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 24. Dashboard Layouts
-- -----------------------------------------------------------
CREATE TABLE dashboard_layouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL DEFAULT 'Default',
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    layout_json     JSONB NOT NULL,
    -- Example:
    -- {
    --   "widgets": [
    --     {"type": "net_pnl", "position": {"x": 0, "y": 0, "w": 4, "h": 2}},
    --     {"type": "win_rate", "position": {"x": 4, "y": 0, "w": 4, "h": 2}},
    --     ...
    --   ]
    -- }
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 25. Trading Day Configuration
-- -----------------------------------------------------------
CREATE TABLE trading_day_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rollover_time   TIME NOT NULL DEFAULT '18:00',
    rollover_tz     VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    flat_by_time    TIME NOT NULL DEFAULT '16:45',
    resume_time     TIME NOT NULL DEFAULT '18:00',
    window_tz       VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE trading_day_exceptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id       UUID NOT NULL REFERENCES trading_day_config(id) ON DELETE CASCADE,
    exception_date  DATE NOT NULL,
    flat_by_time    TIME,                        -- override for this day (null = closed)
    resume_time     TIME,
    notes           VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(config_id, exception_date)
);

-- -----------------------------------------------------------
-- 26. Event Log (audit trail)
-- -----------------------------------------------------------
CREATE TABLE event_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(30),
    entity_id       UUID,
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_log_user_type ON event_log(user_id, event_type);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
