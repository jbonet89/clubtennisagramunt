import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { body, getLocale, json, sameOrigin } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { action } = await params;
    const input = await body(request);
    const supabase = await createClient();
    if (action === "logout") {
      await supabase.auth.signOut();
      return json({ ok: true });
    }
    const password = typeof input.password === "string" ? input.password : "";
    if (action === "reset") {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return json({ error: "unauthorized" }, 401);
      if (password.length < 10 || password.length > 128)
        return json({ error: "invalidData" }, 400);
      const { error } = await supabase.auth.updateUser({ password });
      return error ? json({ error: "error" }, 400) : json({ ok: true });
    }
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: "invalidData" }, 400);
    const callback = new URL(
      "/auth/callback",
      process.env.NEXT_PUBLIC_SITE_URL ||
        "https://clubtennisagramunt.vercel.app",
    ).toString();
    if (action === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callback,
      });
      const response = error
        ? json({ error: "emailError" }, 400)
        : json({ ok: true });
      response.cookies.set("cta_auth_flow", "recovery", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
        secure: request.nextUrl.protocol === "https:",
      });
      response.cookies.set("cta_auth_locale", getLocale(input.locale), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      return response;
    }
    if (!password || password.length > 128)
      return json({ error: "invalidData" }, 400);
    if (action === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? json({ error: "invalidLogin" }, 401) : json({ ok: true });
    }
    if (action === "signup") {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (password.length < 10 || name.length < 2 || name.length > 100)
        return json({ error: "invalidData" }, 400);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback, data: { full_name: name } },
      });
      const response = error
        ? json({ error: "registrationError" }, 400)
        : json({ ok: true });
      response.cookies.set("cta_auth_flow", "signup", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
        secure: request.nextUrl.protocol === "https:",
      });
      response.cookies.set("cta_auth_locale", getLocale(input.locale), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      return response;
    }
    return json({ error: "invalidData" }, 400);
  } catch {
    return json({ error: "error" }, 503);
  }
}
