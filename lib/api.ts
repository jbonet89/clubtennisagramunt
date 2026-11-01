import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export function getLocale(value: unknown): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : "ca";
}
export function sameOrigin(request: NextRequest) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return (
      origin.host === request.headers.get("host") &&
      origin.protocol ===
        `${request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")}:`
    );
  } catch {
    return false;
  }
}
export async function body(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 8000) throw new Error("Invalid body");
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid body");
  return data as Record<string, unknown>;
}
export function databaseError(error: { code?: string; message?: string }) {
  if (error.code === "23P01") return json({ error: "conflict" }, 409);
  if (error.code === "42501") return json({ error: "forbidden" }, 403);
  if (
    error.code === "22023" ||
    error.code?.startsWith("23") ||
    error.code === "22P02"
  )
    return json({ error: "invalidData" }, 400);
  return json({ error: "error" }, 503);
}
