import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin (service-role) Supabase client.
 *
 * ⚠️  This client BYPASSES Row-Level Security.
 *     Use ONLY in trusted server-side contexts:
 *     - Inngest background functions
 *     - Database migrations/seeds
 *     - Admin-only operations
 *
 * NEVER expose this client to the browser or use in Server Components
 * that render user-facing content.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
            "These are required for the admin client."
        );
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
