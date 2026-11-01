import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleLocale = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Refresh first: Supabase updates request cookies before the locale rewrite.
  const authResponse = await updateSession(request);
  const response = handleLocale(request);
  authResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = authResponse.headers.get(name);
    if (value) response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
