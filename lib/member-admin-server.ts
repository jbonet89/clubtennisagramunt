import "server-only";
import { getMemberSession } from "./member-server";
import { json } from "./api";

export class MemberAdminError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export async function memberAdmin() {
  const session = await getMemberSession();
  if (
    !session.profile ||
    session.profile.role !== "admin" ||
    !session.profile.member_active
  )
    throw new MemberAdminError("forbidden", 403);
  const { data, error } = await session.supabase
    .from("admin_sections")
    .select("enabled")
    .eq("id", "socis")
    .single();
  if (error || !data?.enabled) throw new MemberAdminError("forbidden", 403);
  return session as typeof session & {
    profile: NonNullable<typeof session.profile>;
  };
}
export function memberFailure(error: unknown) {
  if (error instanceof MemberAdminError)
    return json({ error: error.code }, error.status);
  const e = error as { code?: string; message?: string };
  if (e?.code === "23505") return json({ error: "duplicateMember" }, 409);
  if (e?.code === "42501") return json({ error: "forbidden" }, 403);
  if (e?.message === "INVITATION_RATE_LIMIT")
    return json({ error: "inviteRate" }, 429);
  if (e?.message === "LINKED_EMAIL_READONLY")
    return json({ error: "linkedEmail" }, 400);
  if (e?.message === "IMPORT_ID_CONFLICT")
    return json({ error: "importConflict" }, 409);
  if (e?.code?.startsWith("22") || e?.code?.startsWith("23"))
    return json({ error: "invalidData" }, 400);
  return json({ error: "error" }, 503);
}
export function memberId(value: string) {
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value))
    throw new MemberAdminError("invalidData");
  return value;
}
export async function adminBody(
  request: Request,
  max = 16000,
): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > max) throw new MemberAdminError("invalidData", 413);
  const raw = await request.text();
  if (raw.length > max) throw new MemberAdminError("invalidData", 413);
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new MemberAdminError("invalidData");
  return data as Record<string, unknown>;
}
export function memberInput(input: Record<string, unknown>) {
  const text = (key: string, max: number) => {
    const value = input[key] == null ? "" : input[key];
    if (
      typeof value !== "string" ||
      value.trim().length > max ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
    )
      throw new MemberAdminError("invalidData");
    return value.trim();
  };
  const name = text("full_name", 100),
    email = text("email", 254).toLowerCase(),
    status = input.status ?? "pending";
  if (
    name.length < 2 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !["active", "pending", "inactive"].includes(String(status))
  )
    throw new MemberAdminError("invalidData");
  const fee =
    input.annual_fee_cents == null || input.annual_fee_cents === ""
      ? null
      : Number(input.annual_fee_cents);
  if (fee !== null && (!Number.isInteger(fee) || fee < 0 || fee > 1000000))
    throw new MemberAdminError("invalidData");
  const category = text("category", 10) || null;
  if (category && !["adult", "junior"].includes(category))
    throw new MemberAdminError("invalidData");
  const family = text("family_id", 36) || null;
  if (family) memberId(family);
  return {
    full_name: name,
    email,
    phone: text("phone", 40),
    status,
    family_id: family,
    legacy_reference: text("legacy_reference", 80),
    category,
    annual_fee_cents: fee,
    season: text("season", 40) || null,
    notes: text("notes", 4000),
    source: ["historical", "invitation"].includes(String(input.source))
      ? input.source
      : "manual",
  };
}
