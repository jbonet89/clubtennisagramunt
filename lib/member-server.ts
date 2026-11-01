import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "./bookings";

export async function getMemberSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return { supabase, profile: null };
  const result = await supabase
    .from("profiles")
    .select("id,full_name,email,role,member_active")
    .eq("id", data.claims.sub)
    .single();
  if (result.error) throw new Error("Unable to load member profile");
  return { supabase, profile: result.data as Profile };
}
