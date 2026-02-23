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
            .from("payouts")
            .select("*, accounts(name)")
            .eq("user_id", user.id)
            .order("date", { ascending: false });

        if (error) throw error;

        // Flatten the accounts(name) into account_name
        const formattedData = data?.map(payout => ({
            ...payout,
            account_name: payout.accounts?.name || null,
            accounts: undefined
        })) || [];

        return NextResponse.json({ data: formattedData });
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
        const { amount, account_id, date, status, notes } = body;

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from("payouts")
            .insert({
                user_id: user.id,
                amount,
                account_id,
                date,
                status,
                notes
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
