import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  memberId,
  adminBody,
  MemberAdminError,
} from "@/lib/member-admin-server";
import { getSupabaseConfig } from "@/utils/supabase/config";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase } = await memberAdmin();
    if (process.env.MEMBER_INVITATIONS_ENABLED !== "true")
      return json({ error: "smtpPending", saved: true }, 503);
    const id = memberId((await params).id);
    const input = await adminBody(request);
    const { data: member, error: lookup } = await supabase
      .from("club_members")
      .select("full_name,email")
      .eq("id", id)
      .single();
    if (lookup) throw lookup;
    if (!member.email) throw new MemberAdminError("emailRequired");
    const reservation = await supabase.rpc("reserve_member_invitation", {
      p_id: id,
    });
    if (reservation.error) throw reservation.error;
    // Isolated anonymous auth client: never replace the administrator's session.
    // Implicit email tokens work across browsers; the site consumes them explicitly.
    const { url, key } = getSupabaseConfig();
    const mailer = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
      },
    });
    const locale = ["ca", "es", "en"].includes(String(input.locale))
      ? input.locale
      : "ca";
    const { error } = await mailer.auth.signInWithOtp({
      email: member.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://clubtennisagramunt.vercel.app",
        data: { full_name: member.full_name, cta_locale: locale },
      },
    });
    const recorded = await supabase
      .from("club_members")
      .update({
        invitation_status: error ? "failed" : "sent",
        ...(error ? {} : { invitation_sent_at: new Date().toISOString() }),
      })
      .eq("id", id);
    if (error) return json({ error: "inviteEmailError", saved: true }, 502);
    if (recorded.error) return json({ error: "inviteRecordError" }, 503);
    return json({ ok: true });
  } catch (error) {
    return memberFailure(error);
  }
}
