import type { NextRequest } from "next/server";
import { getMemberSession } from "@/lib/member-server";
import { databaseError, json, sameOrigin } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    const { id } = await params;
    if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))
      return json({ error: "invalidData" }, 400);
    const { error } = await supabase.rpc("cancel_member_booking", {
      p_booking_id: id,
    });
    return error ? databaseError(error) : json({ ok: true });
  } catch {
    return json({ error: "error" }, 503);
  }
}
