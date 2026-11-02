import type { NextRequest } from "next/server";
import { getMemberSession } from "@/lib/member-server";
import { body, databaseError, json, sameOrigin } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile || profile.role !== "admin" || !profile.member_active)
      return json({ error: "forbidden" }, 403);
    const { userId, active, action } = await body(request);
    if (
      typeof userId !== "string" ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(userId)
    )
      return json({ error: "invalidData" }, 400);
    if (action === "grant_admin") {
      const { error } = await supabase.rpc("grant_admin", {
        p_user_id: userId,
      });
      return error ? databaseError(error) : json({ ok: true });
    }
    if (action !== undefined || typeof active !== "boolean")
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

export async function GET(request: NextRequest) {
  try {
    const {supabase,profile}=await getMemberSession();
    if (!profile?.member_active || !["admin","member"].includes(profile.role)) return json({error:"forbidden"},403);
    const query=(request.nextUrl.searchParams.get("q")??"").trim();
    if(query.length<2 || query.length>100) return json({members:[]});
    const {data,error}=await supabase.rpc("search_booking_members",{p_query:query});
    return error ? databaseError(error) : json({members:data});
  } catch {return json({error:"error"},503);}
}
