import type { NextRequest } from "next/server";
import { getMemberSession } from "@/lib/member-server";
import { body, databaseError, json, sameOrigin } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile || profile.role !== "admin" || !profile.member_active)
      return json({ error: "forbidden" }, 403);
    const { userId, active } = await body(request);
    if (typeof userId !== "string" || typeof active !== "boolean")
      return json({ error: "invalidData" }, 400);
    const { error } = await supabase.rpc("set_member_active", {
      p_user_id: userId,
      p_active: active,
    });
    return error ? databaseError(error) : json({ ok: true });
  } catch {
    return json({ error: "invalidData" }, 400);
  }
}
