import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do NOT add logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake can lead to users
    // being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If the user is not logged in and the path is not an auth route,
    // redirect to login.
    const isAuthRoute =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register");

    const isApiRoute = request.nextUrl.pathname.startsWith("/api");

    if (!user && !isAuthRoute && !isApiRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // If the user IS logged in and is trying to access auth routes,
    // redirect to dashboard.
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
