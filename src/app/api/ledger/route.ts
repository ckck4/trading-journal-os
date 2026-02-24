import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // 1. Fetch Trades
        const { data: trades, error: tradesErr } = await adminClient
            .from("trades")
            .select("id, trading_day, net_pnl, root_symbol")
            .eq("user_id", user.id);
        if (tradesErr) throw tradesErr;

        // 2. Fetch Expenses
        const { data: expenses, error: expensesErr } = await adminClient
            .from("expenses")
            .select("id, date, amount, vendor, description, category")
            .eq("user_id", user.id);
        if (expensesErr) throw expensesErr;

        // 3. Fetch Payouts (from finance_payouts)
        const { data: payouts, error: payoutsErr } = await adminClient
            .from("finance_payouts")
            .select("id, date, amount, status")
            .eq("user_id", user.id);
        if (payoutsErr) throw payoutsErr;

        // 4. Fetch Manual Ledger Entries
        const { data: manualEntries, error: manualErr } = await adminClient
            .from("ledger_entries")
            .select("id, date, type, amount, description, category, source")
            .eq("user_id", user.id);
        if (manualErr) throw manualErr;

        // 5. Fetch Subscriptions for MRR
        const { data: subscriptions, error: subsErr } = await adminClient
            .from("subscriptions")
            .select("amount, billing_cycle")
            .eq("user_id", user.id)
            .eq("is_active", true);
        if (subsErr) throw subsErr;

        // 6. Fetch Prop Evaluations + Accounts for Funding metrics
        const { data: evals, error: evalsErr } = await adminClient
            .from("prop_evaluations")
            .select("stage, status, accounts(starting_balance)")
            .eq("user_id", user.id);
        if (evalsErr) throw evalsErr;

        // --- Compute Entries ---
        const combinedEntries: any[] = [];

        trades?.forEach(t => {
            const netPnl = parseFloat(t.net_pnl || "0");
            if (netPnl === 0) return;
            combinedEntries.push({
                id: `trade_${t.id}`,
                date: t.trading_day,
                type: netPnl > 0 ? "income" : "expense",
                amount: Math.abs(netPnl),
                description: t.root_symbol || "Trade",
                category: "Trading",
                source: "trade"
            });
        });

        expenses?.forEach(e => {
            combinedEntries.push({
                id: `exp_${e.id}`,
                date: e.date,
                type: "expense",
                amount: parseFloat(e.amount || "0"),
                description: e.vendor || e.description || "Expense",
                category: e.category || "General",
                source: "expense"
            });
        });

        payouts?.forEach(p => {
            if (p.status === "received" || p.status === "paid" || p.status === "success" || p.status === "Approved") {
                combinedEntries.push({
                    id: `pay_${p.id}`,
                    date: p.date,
                    type: "income",
                    amount: parseFloat(p.amount || "0"),
                    description: "Prop Firm Payout",
                    category: "Payout",
                    source: "payout"
                });
            }
        });

        manualEntries?.forEach(m => {
            combinedEntries.push({
                id: m.id, // Keep the real ID because manual entries can be edited/deleted
                date: m.date,
                type: m.type,
                amount: parseFloat(m.amount || "0"),
                description: m.description,
                category: m.category,
                source: m.source || "manual"
            });
        });

        combinedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // --- Compute Summary ---
        let totalRevenue = 0;
        let totalExpenses = 0;

        combinedEntries.forEach(c => {
            if (c.type === "income") totalRevenue += c.amount;
            if (c.type === "expense") totalExpenses += c.amount;
        });

        const netProfit = totalRevenue - totalExpenses;
        const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

        let monthlyRecurring = 0;
        subscriptions?.forEach(s => {
            const amt = parseFloat(s.amount || "0");
            if (s.billing_cycle === "monthly") monthlyRecurring += amt;
            else if (s.billing_cycle === "yearly") monthlyRecurring += amt / 12;
            else if (s.billing_cycle === "weekly") monthlyRecurring += amt * 4.33;
        });

        let totalFunding = 0;
        let fundedAccountCount = 0;

        evals?.forEach(ev => {
            if (ev.stage === "funded" && ev.status === "active") {
                fundedAccountCount++;
                const acct = ev.accounts as any;
                if (acct?.starting_balance) {
                    totalFunding += parseFloat(acct.starting_balance);
                }
            }
        });

        let paybackPeriod: number | null = null;
        if (netProfit > 0) {
            const monthlyProfit = netProfit / 12;
            if (monthlyProfit > 0) {
                paybackPeriod = totalExpenses / monthlyProfit;
            }
        }

        return NextResponse.json({
            data: {
                entries: combinedEntries,
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netProfit,
                    roi,
                    monthlyRecurring,
                    totalFunding,
                    fundedAccountCount,
                    paybackPeriod
                },
                propStats: {
                    evalsPurchased: evals?.length || 0,
                    currentlyActive: evals?.filter(e => e.status === "active" && e.stage === "evaluation").length || 0,
                    passed: evals?.filter(e => e.status === "passed").length || 0,
                    funded: fundedAccountCount,
                    failed: evals?.filter(e => e.status === "failed").length || 0,
                    totalFunding
                }
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, amount, description, category, date } = body;

        if (!type || !amount || !date) {
            return NextResponse.json({ error: "type, amount, and date are required" }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from("ledger_entries")
            .insert({
                user_id: user.id,
                type,
                amount,
                description,
                category,
                date,
                source: "manual"
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
