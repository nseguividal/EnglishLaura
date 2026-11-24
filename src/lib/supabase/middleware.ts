import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/steps",
  "/assignments",
  "/analytics",
  "/profile",
  "/onboarding",
  "/admin",
];

const AUTH_ROUTES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow rendering landing/auth pages gracefully if env vars aren't configured yet
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isAdminRoute || isAuthRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, selected_level")
      .eq("id", user.id)
      .single();

    if (isAdminRoute && profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      if (profile?.role === "admin") {
        redirectUrl.pathname = "/admin";
      } else if (!profile?.selected_level) {
        redirectUrl.pathname = "/onboarding";
      } else {
        redirectUrl.pathname = "/dashboard";
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
