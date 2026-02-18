import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImport } from "@/lib/import/run-import";

export async function POST(request: NextRequest) {
    // ── Auth ───────────────────────────────────────────────────────────────
    // Use the SSR server client so it reads the session cookie that was
    // refreshed by middleware.  getUser() verifies the JWT server-side —
    // never trust getSession() alone for auth in route handlers.
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    // Guard 1: no session at all
    if (authError || !user) {
        console.warn("[import] unauthenticated request:", authError?.message ?? "no user");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Guard 2: user object exists but id is missing (malformed JWT / SSR cookie
    // issue).  This is the root cause of "null value in column user_id".
    if (!user.id) {
        console.error("[import] user object has no id:", JSON.stringify(user));
        return NextResponse.json({ error: "Unauthorized — session missing user id" }, { status: 401 });
    }

    const userId = user.id;
    console.log("[import] authenticated user:", userId);

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

    // ── Run pipeline ───────────────────────────────────────────────────────
    // All writes use the admin client to bypass RLS.
    // createAdminClient is inside the try so a missing env var returns 500
    // rather than an unhandled exception.
    try {
        const adminSupabase = createAdminClient();
        console.log("[import] starting pipeline — user:", userId, "file:", file.name, "size:", file.size);
        const result = await runImport(csvText, file.name, userId, adminSupabase);
        console.log("[import] pipeline complete:", result);
        return NextResponse.json(result, { status: 200 });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Import failed";
        console.error("[import] pipeline error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
