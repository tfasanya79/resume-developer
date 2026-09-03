import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAppBasePath } from "@/lib/paths";

function getSafeNext(next: string | null, pathname: string): string {
  const fallback = withAppBasePath("/dashboard", pathname);
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return withAppBasePath(next, pathname);
}

// Handles the Supabase email confirmation and magic-link redirect.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin, pathname } = url;
  const code = searchParams.get("code");
  const next = getSafeNext(searchParams.get("next"), pathname);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const loginUrl = new URL(withAppBasePath("/login", pathname), origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
