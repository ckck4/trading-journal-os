import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from("finance_settings")
            .select("discipline_weights")
            .eq("user_id", user.id)
            .single();

        if (error && error.code !== "PGRST116") throw error;

        let weights = data?.discipline_weights;
        if (!weights) {
            weights = { grade_weight: 70, routine_weight: 30 };
        }

        return NextResponse.json({ data: weights });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const gradeWeight = Number(body.grade_weight) || 0;
        const routineWeight = Number(body.routine_weight) || 0;

        if (gradeWeight + routineWeight !== 100) {
            return NextResponse.json({ error: "Weights must sum to 100" }, { status: 400 });
        }

        const adminClient = createAdminClient();
        // Fetch existing first Since upsert replaces entire row if not careful, but Supabase UI upsert updates provided columns if row exists, unless it's a true replace.
        // Actually, Supabase `upsert` with returning updates only specified columns if it exists, BUT if the row doesn't exist, it might fail if we don't provide all NOT NULL columns (like grading_weights which has default, but better to be safe).
        const { data: existing } = await adminClient
            .from("finance_settings")
            .select("*")
            .eq("user_id", user.id)
            .single();

        let payload: any = {};
        if (existing) {
            payload = {
                ...existing,
                discipline_weights: { grade_weight: gradeWeight, routine_weight: routineWeight },
                updated_at: new Date().toISOString()
            };
        } else {
            payload = {
                user_id: user.id,
                discipline_weights: { grade_weight: gradeWeight, routine_weight: routineWeight }
            };
        }

        const { data, error } = await adminClient
            .from("finance_settings")
            .upsert(payload, { onConflict: "user_id" })
            .select("discipline_weights")
            .single();

        if (error) throw error;
        return NextResponse.json({ data: data.discipline_weights });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
