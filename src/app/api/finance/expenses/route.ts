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
        const { data, error } = await adminClient
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
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
        const { amount, category, vendor, description, date, tags, is_recurring } = body;

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from("expenses")
            .insert({
                user_id: user.id,
                amount,
                category,
                vendor,
                description,
                date,
                tags,
                is_recurring
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
