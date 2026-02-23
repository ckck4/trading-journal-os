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
        const [expensesRes, payoutsRes] = await Promise.all([
            adminClient.from("expenses").select("*").eq("user_id", user.id),
            adminClient.from("payouts").select("*").eq("user_id", user.id)
        ]);

        if (expensesRes.error) throw expensesRes.error;
        if (payoutsRes.error) throw payoutsRes.error;

        const expenses = expensesRes.data || [];
        const payouts = payoutsRes.data || [];

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        // Helper to format "Jan 2026"
        const formatMonth = (date: Date) => {
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };

        // Initialize 12 months arrays (from 11 months ago to this month)
        const last12Months: string[] = [];
        const last6MonthsSet = new Set<string>();

        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            const mStr = formatMonth(d);
            last12Months.push(mStr);
            if (i < 6) last6MonthsSet.add(mStr);
        }

        const inflowsMap = new Map<string, number>(last12Months.map(m => [m, 0]));
        const outflowsMap = new Map<string, number>(last12Months.map(m => [m, 0]));

        let totalInflows12mo = 0;
        let totalOutflows12mo = 0;
        let avgMonthlyBurnSum = 0; // sum for the last 6 months

        expenses.forEach(exp => {
            const d = new Date(exp.date);
            const amt = Number(exp.amount) || 0;
            const monthStr = formatMonth(d);

            if (outflowsMap.has(monthStr)) {
                outflowsMap.set(monthStr, outflowsMap.get(monthStr)! + amt);
                totalOutflows12mo += amt;
                if (last6MonthsSet.has(monthStr)) {
                    avgMonthlyBurnSum += amt;
                }
            }
        });

        payouts.forEach(pay => {
            if (pay.status !== 'received') return;
            const d = new Date(pay.date);
            const amt = Number(pay.amount) || 0;
            const monthStr = formatMonth(d);

            if (inflowsMap.has(monthStr)) {
                inflowsMap.set(monthStr, inflowsMap.get(monthStr)! + amt);
                totalInflows12mo += amt;
            }
        });

        const avgMonthlyBurn = avgMonthlyBurnSum / 6;
        const netCashPosition = totalInflows12mo - totalOutflows12mo;

        const monthlyFlow = last12Months.map(month => {
            const inf = inflowsMap.get(month)!;
            const outf = outflowsMap.get(month)!;
            return {
                month,
                inflows: inf,
                outflows: outf,
                net: inf - outf
            };
        });

        const cumulativePosition: { month: string, cumulative: number }[] = [];
        let runningTotal = 0;
        last12Months.forEach(month => {
            const inf = inflowsMap.get(month)!;
            const outf = outflowsMap.get(month)!;
            runningTotal += (inf - outf);
            cumulativePosition.push({ month, cumulative: runningTotal });
        });

        const result = {
            totalInflows12mo,
            totalOutflows12mo,
            avgMonthlyBurn,
            netCashPosition,
            monthlyFlow,
            cumulativePosition
        };

        return NextResponse.json({ data: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
