import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/lib/api";

export async function GET(request: NextRequest) {
  const store = await cookies();
  const locale = getLocale(store.get("cta_auth_locale")?.value);
  const recovery = store.get("cta_auth_flow")?.value === "recovery";
  const code = request.nextUrl.searchParams.get("code");
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://clubtennisagramunt.vercel.app";
  const target = new URL(`/${locale}/acces?error=expired`, origin);
  if (code) {
    const supabase = await createClient(store);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      target.pathname = recovery ? `/${locale}/acces` : `/${locale}/socis`;
      target.search = recovery ? "?mode=reset" : "";
    }
  }
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.delete("cta_auth_flow");
  response.cookies.delete("cta_auth_locale");
  return response;
}
