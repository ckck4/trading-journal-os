"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = { error: null };

export function RegisterForm() {
    const [state, formAction, pending] = useActionState(signUp, initialState);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {state.error && (
                <div className="rounded-md bg-[rgba(239,68,68,0.15)] px-4 py-3 text-sm text-[#EF4444]">
                    {state.error}
                </div>
            )}

            <div>
                <label
                    htmlFor="displayName"
                    className="mb-1 block text-sm font-medium text-[#E8EAF0]"
                >
                    Display Name
                </label>
                <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    autoComplete="name"
                    className="w-full rounded-md border border-[#2A2F3E] bg-[#1A1E28] px-3 py-2 text-sm text-[#E8EAF0] placeholder-[#5A6178] focus:border-[#6C63FF] focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
                    placeholder="Your name"
                />
            </div>

            <div>
                <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-[#E8EAF0]"
                >
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-md border border-[#2A2F3E] bg-[#1A1E28] px-3 py-2 text-sm text-[#E8EAF0] placeholder-[#5A6178] focus:border-[#6C63FF] focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
                    placeholder="you@example.com"
                />
            </div>

            <div>
                <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-[#E8EAF0]"
                >
                    Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-[#2A2F3E] bg-[#1A1E28] px-3 py-2 text-sm text-[#E8EAF0] placeholder-[#5A6178] focus:border-[#6C63FF] focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
                    placeholder="At least 6 characters"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-[#6C63FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7B73FF] disabled:opacity-50"
            >
                {pending ? "Creating account..." : "Create Account"}
            </button>
        </form>
    );
}
