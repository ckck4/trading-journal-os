import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let date = searchParams.get('date');
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("routine_checkins")
            .select("*")
            .eq("user_id", user.id)
            .eq("checkin_date", date)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        return NextResponse.json({ data: data || null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        const date = body.date || new Date().toISOString().split('T')[0];
        const followed = body.followed_routine ?? false;

        const { data, error } = await supabase
            .from("routine_checkins")
            .upsert({
                user_id: user.id,
                checkin_date: date,
                followed_routine: followed,
                notes: body.notes || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id, checkin_date"
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
