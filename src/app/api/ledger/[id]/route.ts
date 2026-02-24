import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, amount, description, category, date } = body;

        const adminClient = createAdminClient();

        // Ensure it's a manual entry belonging to the user
        const { data: existing, error: checkErr } = await adminClient
            .from("ledger_entries")
            .select("source")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (checkErr || !existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (existing.source !== "manual") {
            return NextResponse.json({ error: "Only manual entries can be edited" }, { status: 400 });
        }

        const { data, error } = await adminClient
            .from("ledger_entries")
            .update({
                type,
                amount,
                description,
                category,
                date
            })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Ensure it's a manual entry belonging to the user
        const { data: existing, error: checkErr } = await adminClient
            .from("ledger_entries")
            .select("source")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (checkErr || !existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (existing.source !== "manual") {
            return NextResponse.json({ error: "Only manual entries can be deleted" }, { status: 400 });
        }

        const { error } = await adminClient
            .from("ledger_entries")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
