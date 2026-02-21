"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerSchema, loginSchema } from "./validation";

export type AuthState = {
    error: string | null;
};

export async function signUp(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const raw = {
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { email, password, displayName } = parsed.data;
    const supabase = await createClient();

    const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName },
        },
    });

    if (authError) {
        return { error: authError.message };
    }

    // Insert the user profile row. The auto_set_user_id trigger does NOT
    // apply to the users table (it uses id = auth.uid(), not user_id).
    // We set id explicitly to match the Supabase Auth user id.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Registration succeeded but failed to retrieve user session." };
    }

    const { error: profileError } = await supabase.from("users").insert({
        id: user.id,
        email,
        display_name: displayName,
        password_hash: "managed-by-supabase-auth",
    });

    if (profileError) {
        // If the profile row already exists (e.g. race condition), that's fine
        if (!profileError.message.includes("duplicate")) {
            return { error: `Profile creation failed: ${profileError.message}` };
        }
    }

    redirect("/onboarding");
}

export async function signIn(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const raw = {
        email: formData.get("email"),
        password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/");
}

export async function signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
