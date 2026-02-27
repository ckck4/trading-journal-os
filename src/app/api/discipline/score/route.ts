import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let date = searchParams.get('date');
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Fetch routine_checkins for date
        const { data: checkin } = await supabase
            .from("routine_checkins")
            .select("followed_routine")
            .eq("user_id", user.id)
            .eq("checkin_date", date)
            .single();

        let routine_score: number | null = null;
        if (checkin) {
            routine_score = checkin.followed_routine ? 100 : 0;
        }

        // 2. Fetch grades for trades on this date
        const { data: dayTrades, error: tradesErr } = await supabase
            .from("trades")
            .select("id")
            .eq("user_id", user.id)
            .eq("trading_day", date);

        if (tradesErr) throw tradesErr;

        let grade_score: number | null = null;
        let graded_trades = 0;
        let total_trades = dayTrades?.length || 0;

        if (dayTrades && dayTrades.length > 0) {
            const tradeIds = dayTrades.map((t: any) => t.id);
            const { data: grades } = await supabase
                .from("trade_grades")
                .select("grade")
                .in("trade_id", tradeIds);

            if (grades && grades.length > 0) {
                graded_trades = grades.length;
                const topGrades = grades.filter((g: any) => ['A+', 'A', 'B+'].includes(g.grade)).length;
                grade_score = (topGrades / graded_trades) * 100;
            }
        }

        // 3. Fetch weights
        const adminClient = createAdminClient();
        const { data: settings } = await adminClient
            .from("finance_settings")
            .select("discipline_weights")
            .eq("user_id", user.id)
            .single();

        const weights = settings?.discipline_weights || { grade_weight: 70, routine_weight: 30 };
        const gw = Number(weights.grade_weight);
        const rw = Number(weights.routine_weight);

        // 4. Calculate Final Score
        let final_score: number | null = null;

        if (routine_score === null && grade_score === null) {
            final_score = null;
        } else if (routine_score !== null && grade_score === null) {
            final_score = routine_score;
        } else if (routine_score === null && grade_score !== null) {
            final_score = grade_score;
        } else if (routine_score !== null && grade_score !== null) {
            final_score = (grade_score * (gw / 100)) + (routine_score * (rw / 100));
        }

        if (final_score !== null) {
            final_score = Math.round(final_score * 10) / 10;
        }

        // 5. Determine label
        let label = "No data";
        if (final_score !== null) {
            if (final_score >= 90) label = "Excellent";
            else if (final_score >= 75) label = "Good";
            else if (final_score >= 60) label = "Average";
            else if (final_score >= 40) label = "Poor";
            else label = "Critical";
        }

        return NextResponse.json({
            data: {
                score: final_score,
                label,
                grade_score,
                routine_score,
                grade_weight: gw,
                routine_weight: rw,
                graded_trades,
                total_trades,
                followed_routine: checkin ? checkin.followed_routine : null
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
