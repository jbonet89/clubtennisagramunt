import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  memberId,
  adminBody,
  MemberAdminError,
} from "@/lib/member-admin-server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase } = await memberAdmin();
    const id = memberId((await params).id);
    const b = await adminBody(request);
    const amount = Number(b.amount),
      description = String(b.description ?? "").trim(),
      season = String(b.season ?? "").trim();
    const date = String(b.due_date ?? "");
    const status = String(b.status);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001 ||
      description.length < 2 ||
      description.length > 160 ||
      season.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(new Date(date).getTime()) ||
      !["paid", "pending", "returned"].includes(status)
    )
      throw new MemberAdminError("invalidData");
    let query;
    if (b.id)
      query = supabase
        .from("club_dues")
        .update({
          description,
          amount,
          season: season || null,
          due_date: date,
          status,
        })
        .eq("id", memberId(String(b.id)))
        .eq("member_id", id)
        .select("id")
        .maybeSingle();
    else
      query = supabase
        .from("club_dues")
        .insert({
          member_id: id,
          description,
          amount,
          season: season || null,
          due_date: date,
          status,
          source: "manual",
        })
        .select("id")
        .single();
    const result = await query;
    if (result.error?.code === "23505")
      return json({ error: "duplicateFee" }, 409);
    if (result.error) throw result.error;
    if (!result.data) throw new MemberAdminError("notFound", 404);
    return json({ ok: true });
  } catch (error) {
    return memberFailure(error);
  }
}
