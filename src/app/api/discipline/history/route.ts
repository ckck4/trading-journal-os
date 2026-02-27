import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30', 10);

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminClient = createAdminClient();
        const { data: settings } = await adminClient
            .from("finance_settings")
            .select("discipline_weights")
            .eq("user_id", user.id)
            .single();

        const weights = settings?.discipline_weights || { grade_weight: 70, routine_weight: 30 };
        const gw = Number(weights.grade_weight);
        const rw = Number(weights.routine_weight);

        // Calculate boundary date
        const d = new Date();
        d.setDate(d.getDate() - days);
        const boundaryDate = d.toISOString().split('T')[0];

        // Fetch checkins
        const { data: checkins } = await supabase
            .from("routine_checkins")
            .select("checkin_date, followed_routine")
            .eq("user_id", user.id)
            .gte("checkin_date", boundaryDate);

        // Fetch trades & grades
        // inner join using Supabase: trades(id, trading_day, trade_grades(grade))
        const { data: trades } = await supabase
            .from("trades")
            .select(`
                id,
                trading_day,
                trade_grades!left ( grade )
            `)
            .eq("user_id", user.id)
            .gte("trading_day", boundaryDate);

        // Group by day map
        const dayMap: Record<string, any> = {};

        // Populate from checkins
        if (checkins) {
            checkins.forEach((c: any) => {
                if (!dayMap[c.checkin_date]) {
                    dayMap[c.checkin_date] = { date: c.checkin_date, checkin: null, trades: [] };
                }
                dayMap[c.checkin_date].checkin = c.followed_routine;
            });
        }

        // Populate from trades
        if (trades) {
            trades.forEach((t: any) => {
                if (!dayMap[t.trading_day]) {
                    dayMap[t.trading_day] = { date: t.trading_day, checkin: null, trades: [] };
                }
                // extract grade if exists
                let grade = null;
                if (t.trade_grades) {
                    if (Array.isArray(t.trade_grades) && t.trade_grades.length > 0) {
                        grade = t.trade_grades[0].grade;
                    } else if (!Array.isArray(t.trade_grades) && t.trade_grades.grade) {
                        grade = t.trade_grades.grade;
                    }
                }
                dayMap[t.trading_day].trades.push({ hasGrade: !!grade, topGrade: grade ? ['A+', 'A', 'B+'].includes(grade) : false });
            });
        }

        // Compute scores
        const results = [];
        for (const [date, data] of Object.entries(dayMap)) {
            let routine_score: number | null = null;
            if (data.checkin !== null) {
                routine_score = data.checkin ? 100 : 0;
            }

            let grade_score: number | null = null;
            let graded_trades = 0;
            const gradedList = data.trades.filter((tx: any) => tx.hasGrade);
            if (gradedList.length > 0) {
                graded_trades = gradedList.length;
                const topCount = gradedList.filter((tx: any) => tx.topGrade).length;
                grade_score = (topCount / graded_trades) * 100;
            }

            let final_score: number | null = null;
            if (routine_score === null && grade_score === null) {
                continue; // Skip days with no data
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

            let label = "No data";
            if (final_score !== null) {
                if (final_score >= 90) label = "Excellent";
                else if (final_score >= 75) label = "Good";
                else if (final_score >= 60) label = "Average";
                else if (final_score >= 40) label = "Poor";
                else label = "Critical";
            }

            results.push({
                date,
                score: final_score,
                label,
                followed_routine: data.checkin,
                graded_trades
            });
        }

        // Sort desc
        results.sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({ data: results });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
