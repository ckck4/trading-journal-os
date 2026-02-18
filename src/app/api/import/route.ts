import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImport } from "@/lib/import/run-import";

export async function POST(request: NextRequest) {
    // ── Auth: identify the calling user via server Supabase client ─────────
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse multipart/form-data ──────────────────────────────────────────
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
        return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
    }

    const csvText = await file.text();
    if (!csvText.trim()) {
        return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // ── Run pipeline — admin client bypasses RLS for all DB writes ─────────
    const adminSupabase = createAdminClient();

    try {
        const result = await runImport(csvText, file.name, user.id, adminSupabase);
        return NextResponse.json(result, { status: 200 });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Import failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
