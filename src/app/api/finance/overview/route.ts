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

        // Fetch all data needed
        const [expensesRes, payoutsRes, subsRes] = await Promise.all([
            adminClient.from("expenses").select("*").eq("user_id", user.id),
            adminClient.from("payouts").select("*").eq("user_id", user.id),
            adminClient.from("subscriptions").select("*").eq("user_id", user.id).eq("is_active", true)
        ]);

        if (expensesRes.error) throw expensesRes.error;
        if (payoutsRes.error) throw payoutsRes.error;
        if (subsRes.error) throw subsRes.error;

        const expenses = expensesRes.data || [];
        const payouts = payoutsRes.data || [];
        const activeSubs = subsRes.data || [];

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

        // Helper to format "Jan 2026"
        const formatMonth = (date: Date) => {
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };

        // Initialize 6 months trend arrays
        const last6Months: string[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            last6Months.push(formatMonth(d));
        }

        const expenseMap = new Map<string, number>(last6Months.map(m => [m, 0]));
        const revenueMap = new Map<string, number>(last6Months.map(m => [m, 0]));
        const categoryMap = new Map<string, number>();

        let thisMonthExpenses = 0;
        let lastMonthExpenses = 0;
        let ytdSpend = 0;
        let avgMonthlyExpenseSum = 0; // sum for the last 6 full/partial months

        expenses.forEach(exp => {
            const d = new Date(exp.date);
            const amt = Number(exp.amount) || 0;
            const monthStr = formatMonth(d);

            // YTD
            if (d.getFullYear() === currentYear) ytdSpend += amt;

            // This month
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                thisMonthExpenses += amt;
            }

            // Last month
            if (d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()) {
                lastMonthExpenses += amt;
            }

            // Trend
            if (expenseMap.has(monthStr)) {
                expenseMap.set(monthStr, expenseMap.get(monthStr)! + amt);
                avgMonthlyExpenseSum += amt;
            }

            // Category (all time or just recent? let's do all time, or maybe YTD? User didn't specify, we'll do all time for now)
            categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + amt);
        });

        let thisMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let ytdEarned = 0;

        payouts.forEach(pay => {
            if (pay.status !== 'received') return;
            const d = new Date(pay.date);
            const amt = Number(pay.amount) || 0;
            const monthStr = formatMonth(d);

            // YTD
            if (d.getFullYear() === currentYear) ytdEarned += amt;

            // This month
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                thisMonthRevenue += amt;
            }

            // Last month
            if (d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth()) {
                lastMonthRevenue += amt;
            }

            // Trend
            if (revenueMap.has(monthStr)) {
                revenueMap.set(monthStr, revenueMap.get(monthStr)! + amt);
            }
        });

        const activeSubscriptionsMonthly = activeSubs.reduce((sum, sub) => {
            const amt = Number(sub.amount) || 0;
            let monthly = 0;
            if (sub.billing_cycle === 'yearly') monthly = amt / 12;
            else if (sub.billing_cycle === 'weekly') monthly = amt * 4.33;
            else monthly = amt;
            return sum + monthly;
        }, 0);

        const thisMonthNet = thisMonthRevenue - thisMonthExpenses;
        const lastMonthNet = lastMonthRevenue - lastMonthExpenses;
        const avgMonthlyExpense = avgMonthlyExpenseSum / 6;

        let ytdROI = 0;
        if (ytdSpend > 0) {
            ytdROI = ((ytdEarned - ytdSpend) / ytdSpend) * 100;
        }

        const monthlyExpenseTrend = last6Months.map(month => ({ month, amount: expenseMap.get(month)! }));
        const monthlyRevenueTrend = last6Months.map(month => ({ month, amount: revenueMap.get(month)! }));
        const netProfitOverTime = last6Months.map(month => ({
            month,
            amount: revenueMap.get(month)! - expenseMap.get(month)!
        }));

        const expenseByCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
            category,
            amount
        })).sort((a, b) => b.amount - a.amount);

        const result = {
            thisMonthExpenses,
            thisMonthRevenue,
            thisMonthNet,
            lastMonthNet,
            avgMonthlyExpense,
            activeSubscriptionsMonthly,
            ytdSpend,
            ytdEarned,
            ytdROI,
            monthlyExpenseTrend,
            monthlyRevenueTrend,
            netProfitOverTime,
            expenseByCategory
        };

        return NextResponse.json({ data: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
