import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "./bookings";

export async function getMemberSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return { supabase, profile: null };
  let result = await supabase
    .from("profiles")
    .select("id,full_name,email,phone,role,member_active")
    .eq("id", data.claims.sub)
    .single();
  if (result.error) throw new Error("Unable to load member profile");
  if (!result.data.member_active) {
    const claimed = await supabase.rpc("claim_census_membership");
    if (claimed.error) throw new Error("Unable to link membership register");
    if (claimed.data) {
      result = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,role,member_active")
        .eq("id", data.claims.sub)
        .single();
      if (result.error) throw new Error("Unable to load linked member profile");
    }
  }
  return { supabase, profile: result.data as Profile };
}
