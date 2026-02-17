// ============================================================
// Trading Journal OS — Complete Drizzle ORM Schema
// Source: db/01_schema.sql (26 tables)
// Target: Supabase PostgreSQL 15+
// ============================================================

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    numeric,
    date,
    time,
    timestamp,
    jsonb,
    bigserial,
    index,
    unique,
    primaryKey,
} from "drizzle-orm/pg-core";

// ── Helper: common timestamp columns ───────────────────────
const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
};

// ============================================================
// 1. Users (profile — auth handled by Supabase Auth)
// ============================================================
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    ...timestamps,
});

// ============================================================
// 2. Accounts (trading accounts)
// ============================================================
export const accounts = pgTable(
    "accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 100 }).notNull(),
        externalId: varchar("external_id", { length: 255 }),
        broker: varchar("broker", { length: 50 }).notNull().default("Tradeovate"),
        startingBalance: numeric("starting_balance", { precision: 14, scale: 2 })
            .notNull()
            .default("0"),
        currency: varchar("currency", { length: 3 }).notNull().default("USD"),
        isArchived: boolean("is_archived").notNull().default(false),
        ...timestamps,
    },
    (t) => [unique("accounts_user_external_id").on(t.userId, t.externalId)]
);

// ============================================================
// 3. Instruments
// ============================================================
export const instruments = pgTable(
    "instruments",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        rootSymbol: varchar("root_symbol", { length: 10 }).notNull(),
        displayName: varchar("display_name", { length: 50 }).notNull(),
        tickSize: numeric("tick_size", { precision: 10, scale: 6 }).notNull(),
        tickValue: numeric("tick_value", { precision: 10, scale: 4 }).notNull(),
        commissionPerSide: numeric("commission_per_side", { precision: 8, scale: 4 })
            .notNull()
            .default("0"),
        currency: varchar("currency", { length: 3 }).notNull().default("USD"),
        isMicro: boolean("is_micro").notNull().default(true),
        multiplier: numeric("multiplier", { precision: 10, scale: 4 })
            .notNull()
            .default("1"),
        ...timestamps,
    },
    (t) => [unique("instruments_user_root_symbol").on(t.userId, t.rootSymbol)]
);

// Per-account commission overrides
export const accountInstrumentFees = pgTable(
    "account_instrument_fees",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        instrumentId: uuid("instrument_id")
            .notNull()
            .references(() => instruments.id, { onDelete: "cascade" }),
        commissionPerSide: numeric("commission_per_side", { precision: 8, scale: 4 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique("aif_account_instrument").on(t.accountId, t.instrumentId)]
);

// ============================================================
// 4. Sessions
// ============================================================
export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 50 }).notNull(),
        startTime: time("start_time").notNull(),
        endTime: time("end_time").notNull(),
        timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
        isActive: boolean("is_active").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        ...timestamps,
    },
    (t) => [unique("sessions_user_name").on(t.userId, t.name)]
);

// ============================================================
// 5. Strategies
// ============================================================
export const strategies = pgTable(
    "strategies",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 100 }).notNull(),
        description: text("description"),
        isActive: boolean("is_active").notNull().default(true),
        version: integer("version").notNull().default(1),
        ...timestamps,
    },
    (t) => [unique("strategies_user_name").on(t.userId, t.name)]
);

// Strategy auto-assign rules
export const strategyAutoAssignRules = pgTable("strategy_auto_assign_rules", {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
        .notNull()
        .references(() => strategies.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id").references(() => instruments.id, {
        onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => sessions.id, {
        onDelete: "set null",
    }),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Strategy confluences (checklist template)
export const strategyConfluences = pgTable("strategy_confluences", {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
        .notNull()
        .references(() => strategies.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 200 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Strategy version history
export const strategyVersions = pgTable("strategy_versions", {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
        .notNull()
        .references(() => strategies.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotJson: jsonb("snapshot_json").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    changeNote: text("change_note"),
});

// ============================================================
// 6. Tags
// ============================================================
export const tags = pgTable(
    "tags",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 50 }).notNull(),
        color: varchar("color", { length: 7 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique("tags_user_name").on(t.userId, t.name)]
);

// ============================================================
// 7. Import Batches
// ============================================================
export const importBatches = pgTable("import_batches", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileHash: varchar("file_hash", { length: 64 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    totalRows: integer("total_rows").notNull().default(0),
    newFills: integer("new_fills").notNull().default(0),
    duplicateFills: integer("duplicate_fills").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    errorDetails: jsonb("error_details"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 9. Trades (defined before fills so fills can reference trades)
// ============================================================
export const trades = pgTable(
    "trades",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        instrumentId: uuid("instrument_id").references(() => instruments.id),
        rootSymbol: varchar("root_symbol", { length: 10 }).notNull(),

        // Timing
        tradingDay: date("trading_day").notNull(),
        entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
        exitTime: timestamp("exit_time", { withTimezone: true }),
        durationSeconds: integer("duration_seconds"),
        sessionId: uuid("session_id").references(() => sessions.id),

        // Position
        side: varchar("side", { length: 5 }).notNull(), // 'LONG' or 'SHORT'
        entryQty: integer("entry_qty").notNull(),
        exitQty: integer("exit_qty").notNull().default(0),
        avgEntryPrice: numeric("avg_entry_price", { precision: 14, scale: 6 }).notNull(),
        avgExitPrice: numeric("avg_exit_price", { precision: 14, scale: 6 }),
        isOpen: boolean("is_open").notNull().default(true),

        // P&L
        grossPnl: numeric("gross_pnl", { precision: 14, scale: 2 }).notNull().default("0"),
        commissionTotal: numeric("commission_total", { precision: 10, scale: 4 })
            .notNull()
            .default("0"),
        feesTotal: numeric("fees_total", { precision: 10, scale: 4 }).notNull().default("0"),
        netPnl: numeric("net_pnl", { precision: 14, scale: 2 }).notNull().default("0"),

        // R-Multiple
        initialStopPrice: numeric("initial_stop_price", { precision: 14, scale: 6 }),
        initialStopPoints: numeric("initial_stop_points", { precision: 10, scale: 4 }),
        rMultiple: numeric("r_multiple", { precision: 8, scale: 4 }),

        // Strategy
        strategyId: uuid("strategy_id").references(() => strategies.id, {
            onDelete: "set null",
        }),
        strategyAuto: boolean("strategy_auto").notNull().default(false),

        // Outcome
        outcome: varchar("outcome", { length: 10 }),

        // Notes
        notes: text("notes"),
        tradingviewLink: varchar("tradingview_link", { length: 500 }),

        // Grouping
        groupingMethod: varchar("grouping_method", { length: 20 })
            .notNull()
            .default("flat_to_flat"),
        manuallyAdjusted: boolean("manually_adjusted").notNull().default(false),

        ...timestamps,
    },
    (t) => [
        index("idx_trades_user_day").on(t.userId, t.tradingDay),
        index("idx_trades_account").on(t.accountId),
        index("idx_trades_strategy").on(t.strategyId),
        index("idx_trades_root_symbol").on(t.rootSymbol),
        index("idx_trades_session").on(t.sessionId),
    ]
);

// ============================================================
// 8. Fills (source of truth)
// ============================================================
export const fills = pgTable(
    "fills",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        importBatchId: uuid("import_batch_id")
            .notNull()
            .references(() => importBatches.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        fillHash: varchar("fill_hash", { length: 64 }).notNull(),

        // Raw CSV fields
        rawFillId: varchar("raw_fill_id", { length: 100 }),
        rawOrderId: varchar("raw_order_id", { length: 100 }),
        rawInstrument: varchar("raw_instrument", { length: 200 }),
        rootSymbol: varchar("root_symbol", { length: 10 }).notNull(),
        side: varchar("side", { length: 4 }).notNull(), // 'BUY' or 'SELL'
        quantity: integer("quantity").notNull(),
        price: numeric("price", { precision: 14, scale: 6 }).notNull(),
        fillTime: timestamp("fill_time", { withTimezone: true }).notNull(),
        commission: numeric("commission", { precision: 8, scale: 4 }),
        fee: numeric("fee", { precision: 8, scale: 4 }).default("0"),

        // Derived
        instrumentId: uuid("instrument_id").references(() => instruments.id),
        tradingDay: date("trading_day").notNull(),
        tradeId: uuid("trade_id").references(() => trades.id, {
            onDelete: "set null",
        }),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        unique("fills_user_hash").on(t.userId, t.fillHash),
        index("idx_fills_user_trading_day").on(t.userId, t.tradingDay),
        index("idx_fills_trade_id").on(t.tradeId),
        index("idx_fills_account_id").on(t.accountId),
        index("idx_fills_root_symbol").on(t.rootSymbol),
    ]
);

// ============================================================
// 10. Trade Tags (many-to-many)
// ============================================================
export const tradeTags = pgTable(
    "trade_tags",
    {
        tradeId: uuid("trade_id")
            .notNull()
            .references(() => trades.id, { onDelete: "cascade" }),
        tagId: uuid("tag_id")
            .notNull()
            .references(() => tags.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.tradeId, t.tagId] })]
);

// ============================================================
// 11. Trade Screenshots
// ============================================================
export const tradeScreenshots = pgTable("trade_screenshots", {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
        .notNull()
        .references(() => trades.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 50 }),
    caption: varchar("caption", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 12. Grading Rubrics
// ============================================================
export const gradingRubrics = pgTable("grading_rubrics", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
});

export const gradingRubricCategories = pgTable("grading_rubric_categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    rubricId: uuid("rubric_id")
        .notNull()
        .references(() => gradingRubrics.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("25.0"),
    maxScore: integer("max_score").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 13. Trade Grades
// ============================================================
export const tradeGrades = pgTable(
    "trade_grades",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        tradeId: uuid("trade_id")
            .notNull()
            .references(() => trades.id, { onDelete: "cascade" }),
        rubricId: uuid("rubric_id")
            .notNull()
            .references(() => gradingRubrics.id),
        categoryScores: jsonb("category_scores").notNull().default("[]"),
        numericScore: numeric("numeric_score", { precision: 5, scale: 2 }).notNull(),
        letterGrade: varchar("letter_grade", { length: 2 }).notNull(),
        confluenceResults: jsonb("confluence_results").default("[]"),
        notes: text("notes"),
        ...timestamps,
    },
    (t) => [unique("trade_grades_trade_id").on(t.tradeId)]
);

// ============================================================
// 14. Grade Roll-ups (materialized/cached)
// ============================================================
export const gradeRollups = pgTable(
    "grade_rollups",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: uuid("account_id").references(() => accounts.id),
        periodType: varchar("period_type", { length: 10 }).notNull(),
        periodStart: date("period_start").notNull(),
        periodEnd: date("period_end").notNull(),
        avgNumeric: numeric("avg_numeric", { precision: 5, scale: 2 }).notNull(),
        avgLetter: varchar("avg_letter", { length: 2 }).notNull(),
        tradeCount: integer("trade_count").notNull(),
        gradedCount: integer("graded_count").notNull(),
        categoryAvgs: jsonb("category_avgs").default("{}"),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        unique("grade_rollups_unique").on(
            t.userId,
            t.accountId,
            t.periodType,
            t.periodStart
        ),
    ]
);

// ============================================================
// 15. Daily Summaries (materialized/cached)
// ============================================================
export const dailySummaries = pgTable(
    "daily_summaries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id),
        tradingDay: date("trading_day").notNull(),

        // Metrics
        tradeCount: integer("trade_count").notNull().default(0),
        winCount: integer("win_count").notNull().default(0),
        lossCount: integer("loss_count").notNull().default(0),
        breakevenCount: integer("breakeven_count").notNull().default(0),
        grossPnl: numeric("gross_pnl", { precision: 14, scale: 2 }).notNull().default("0"),
        netPnl: numeric("net_pnl", { precision: 14, scale: 2 }).notNull().default("0"),
        commissionTotal: numeric("commission_total", { precision: 10, scale: 4 })
            .notNull()
            .default("0"),
        feesTotal: numeric("fees_total", { precision: 10, scale: 4 }).notNull().default("0"),
        winRate: numeric("win_rate", { precision: 5, scale: 2 }),
        profitFactor: numeric("profit_factor", { precision: 10, scale: 4 }),
        avgWin: numeric("avg_win", { precision: 14, scale: 2 }),
        avgLoss: numeric("avg_loss", { precision: 14, scale: 2 }),
        largestWin: numeric("largest_win", { precision: 14, scale: 2 }),
        largestLoss: numeric("largest_loss", { precision: 14, scale: 2 }),
        avgR: numeric("avg_r", { precision: 8, scale: 4 }),
        totalR: numeric("total_r", { precision: 10, scale: 4 }),
        maxContracts: integer("max_contracts"),

        // Grade
        avgGradeNumeric: numeric("avg_grade_numeric", { precision: 5, scale: 2 }),
        avgGradeLetter: varchar("avg_grade_letter", { length: 2 }),

        // Equity
        cumulativePnl: numeric("cumulative_pnl", { precision: 14, scale: 2 })
            .notNull()
            .default("0"),

        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        unique("daily_summaries_unique").on(t.userId, t.accountId, t.tradingDay),
        index("idx_daily_summaries_day").on(t.userId, t.tradingDay),
    ]
);

// ============================================================
// 16. Prop Firm Templates
// ============================================================
export const propTemplates = pgTable("prop_templates", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    firmName: varchar("firm_name", { length: 100 }).notNull().default("LucidFlex"),
    templateName: varchar("template_name", { length: 100 }).notNull(),
    version: integer("version").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    rulesJson: jsonb("rules_json").notNull(),
    ...timestamps,
});

// Prop template version history
export const propTemplateVersions = pgTable("prop_template_versions", {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
        .notNull()
        .references(() => propTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    rulesJson: jsonb("rules_json").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    changeNote: text("change_note"),
});

// ============================================================
// 17. Prop Evaluations
// ============================================================
export const propEvaluations = pgTable("prop_evaluations", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
        .notNull()
        .references(() => accounts.id),
    templateId: uuid("template_id")
        .notNull()
        .references(() => propTemplates.id),
    stage: varchar("stage", { length: 30 }).notNull().default("evaluation"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    // Cached rule state
    cumulativePnl: numeric("cumulative_pnl", { precision: 14, scale: 2 })
        .notNull()
        .default("0"),
    maxDrawdown: numeric("max_drawdown", { precision: 14, scale: 2 })
        .notNull()
        .default("0"),
    consistencyPct: numeric("consistency_pct", { precision: 5, scale: 2 }),
    daysTraded: integer("days_traded").notNull().default(0),
    violations: jsonb("violations").default("[]"),

    ...timestamps,
});

// ============================================================
// 18. Payout Records
// ============================================================
export const payouts = pgTable("payouts", {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
        .notNull()
        .references(() => propEvaluations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    payoutNumber: integer("payout_number").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
});

// ============================================================
// 19. Business Ledger
// ============================================================
export const expenseCategories = pgTable(
    "expense_categories",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 100 }).notNull(),
        icon: varchar("icon", { length: 50 }),
        sortOrder: integer("sort_order").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique("expense_categories_user_name").on(t.userId, t.name)]
);

export const businessEntries = pgTable("business_entries", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    entryType: varchar("entry_type", { length: 10 }).notNull(), // 'expense' or 'revenue'
    categoryId: uuid("category_id").references(() => expenseCategories.id),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: varchar("description", { length: 255 }),
    entryDate: date("entry_date").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceRule: varchar("recurrence_rule", { length: 50 }),
    source: varchar("source", { length: 50 }),
    referenceId: uuid("reference_id"),
    notes: text("notes"),
    ...timestamps,
});

// ============================================================
// 20. Goals
// ============================================================
export const goals = pgTable("goals", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    goalType: varchar("goal_type", { length: 20 }).notNull(),
    metric: varchar("metric", { length: 50 }).notNull(),
    targetValue: numeric("target_value", { precision: 14, scale: 4 }).notNull(),
    targetOperator: varchar("target_operator", { length: 5 }).notNull().default(">="),
    period: varchar("period", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    currentValue: numeric("current_value", { precision: 14, scale: 4 }),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    ...timestamps,
});

// ============================================================
// 21. Routines
// ============================================================
export const routines = pgTable("routines", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    routineType: varchar("routine_type", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
});

export const routineItems = pgTable("routine_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    routineId: uuid("routine_id")
        .notNull()
        .references(() => routines.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 200 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routineCompletions = pgTable(
    "routine_completions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        routineId: uuid("routine_id")
            .notNull()
            .references(() => routines.id, { onDelete: "cascade" }),
        tradingDay: date("trading_day").notNull(),
        completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
        itemsCompleted: jsonb("items_completed").notNull().default("[]"),
    },
    (t) => [
        unique("routine_completions_unique").on(t.userId, t.routineId, t.tradingDay),
    ]
);

// ============================================================
// 22. AI Coach Insights
// ============================================================
export const aiInsights = pgTable("ai_insights", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    insightType: varchar("insight_type", { length: 30 }).notNull(),
    tradingDay: date("trading_day"),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default("{}"),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 23. Leak Detector Signals
// ============================================================
export const leakSignals = pgTable("leak_signals", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    signalType: varchar("signal_type", { length: 50 }).notNull(),
    dimensionKey: varchar("dimension_key", { length: 100 }).notNull(),
    description: text("description").notNull(),
    severity: varchar("severity", { length: 10 }).notNull().default("medium"),
    metrics: jsonb("metrics").notNull(),
    tradeIds: jsonb("trade_ids").notNull().default("[]"), // stored as JSON array of UUIDs
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    ...timestamps,
});

// ============================================================
// 24. Dashboard Layouts
// ============================================================
export const dashboardLayouts = pgTable("dashboard_layouts", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull().default("Default"),
    isDefault: boolean("is_default").notNull().default(false),
    layoutJson: jsonb("layout_json").notNull(),
    ...timestamps,
});

// ============================================================
// 25. Trading Day Configuration
// ============================================================
export const tradingDayConfig = pgTable(
    "trading_day_config",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        rolloverTime: time("rollover_time").notNull().default("18:00"),
        rolloverTz: varchar("rollover_tz", { length: 64 })
            .notNull()
            .default("America/New_York"),
        flatByTime: time("flat_by_time").notNull().default("16:45"),
        resumeTime: time("resume_time").notNull().default("18:00"),
        windowTz: varchar("window_tz", { length: 64 })
            .notNull()
            .default("America/New_York"),
        ...timestamps,
    },
    (t) => [unique("trading_day_config_user").on(t.userId)]
);

export const tradingDayExceptions = pgTable(
    "trading_day_exceptions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        configId: uuid("config_id")
            .notNull()
            .references(() => tradingDayConfig.id, { onDelete: "cascade" }),
        exceptionDate: date("exception_date").notNull(),
        flatByTime: time("flat_by_time"),
        resumeTime: time("resume_time"),
        notes: varchar("notes", { length: 200 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        unique("trading_day_exceptions_unique").on(t.configId, t.exceptionDate),
    ]
);

// ============================================================
// 26. Event Log (audit trail)
// ============================================================
export const eventLog = pgTable(
    "event_log",
    {
        id: bigserial("id", { mode: "bigint" }).primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        eventType: varchar("event_type", { length: 50 }).notNull(),
        entityType: varchar("entity_type", { length: 30 }),
        entityId: uuid("entity_id"),
        payload: jsonb("payload"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        index("idx_event_log_user_type").on(t.userId, t.eventType),
        index("idx_event_log_entity").on(t.entityType, t.entityId),
    ]
);
